import { fileURLToPath } from 'node:url';
import { getLogger } from '../../src/observability/json-logger.js';
import {
  boundedRouteLabel,
  createHttpErrorTracker,
} from '../../src/observability/http-error-tracker.js';
import { createWorkbenchServer as createCommercialServer } from '../../apps/aetherforge-commercial/server.mjs';
import { createWorkbenchServer as createCompanionServer } from '../../apps/aetherforge-workbench/server.mjs';

function captureLogger(name = 'aetherforge-server') {
  const records = [];
  const logger = getLogger(name, {
    sink: {
      write(value) {
        records.push(JSON.parse(value));
      },
    },
    now: () => '2026-10-26T00:00:00.000Z',
  });
  return { records, logger };
}

async function serverResponse(factory, options) {
  const server = factory(options);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = server.address().port;
    return await fetch(
      `http://127.0.0.1:${port}/api/assets?secret=NEVER_LOG_THIS_VALUE`,
    );
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe('bounded unhandled HTTP error tracking', () => {
  test('logs only explicitly approved route labels and never query strings or exception text', () => {
    const { records, logger } = captureLogger();
    const tracker = createHttpErrorTracker('aetherforge-server', {
      logger,
      createRequestId: () => 'request-001',
    });
    expect(
      tracker.capture(new Error('top secret password'), {
        method: 'GET',
        url: '/api/assets?token=hidden_value',
      }),
    ).toBe(true);
    expect(records).toEqual([
      {
        timestamp: '2026-10-26T00:00:00.000Z',
        level: 'error',
        logger: 'aetherforge-server',
        message: 'Unhandled HTTP request',
        event: 'http.request.unhandled',
        requestId: 'request-001',
        route: '/api/assets',
        method: 'GET',
        statusCode: 500,
      },
    ]);
    expect(JSON.stringify(records)).not.toMatch(/top secret|password|hidden_value|token=/u);
  });

  test('rejects unlisted paths and redacts dynamic asset and workspace identifiers', () => {
    expect(boundedRouteLabel('/unknown?private=secret')).toBe('unmatched');
    expect(boundedRouteLabel('/api/assets/' + 'a'.repeat(64) + '.png')).toBe('/api/assets/:id');
    expect(boundedRouteLabel('/api/workspace/projects/privateproject')).toBe(
      '/api/workspace/projects/:id',
    );
    expect(boundedRouteLabel('/api/workspace/projects/privateproject?secret=token')).toBe(
      '/api/workspace/projects/:id',
    );
    expect(boundedRouteLabel({ pathname: '/api/run' })).toBe('unmatched');
  });

  test.each([
    ['companion', createCompanionServer],
    ['commercial', createCommercialServer],
  ])('%s emits one structured 500 event for an actual unhandled route exception', async (_, factory) => {
    const { records, logger } = captureLogger();
    const tracker = createHttpErrorTracker('aetherforge-server', {
      logger,
      createRequestId: () => 'test-500',
    });
    const filePath = fileURLToPath(new URL('../../package.json', import.meta.url));
    const response = await serverResponse(factory, {
      assetRoot: filePath,
      errorTracker: tracker,
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Workbench request failed' });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      event: 'http.request.unhandled',
      route: '/api/assets',
      statusCode: 500,
      requestId: 'test-500',
      method: 'GET',
    });
    expect(JSON.stringify(records)).not.toMatch(/NEVER_LOG_THIS_VALUE|package\.json/u);
  });
});
