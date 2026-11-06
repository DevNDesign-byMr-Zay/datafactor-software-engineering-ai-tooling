import { describe, expect, test } from '@jest/globals';

import { createWorkbenchFailureHandler } from '../../src/api/workbench-http-failure.js';
import { RequestBodyError } from '../../apps/aetherforge-workbench/http-request-body.mjs';
import { createWorkbenchServer as createCompanion } from '../../apps/aetherforge-workbench/server.mjs';
import { createWorkbenchServer as createCommercial } from '../../apps/aetherforge-commercial/server.mjs';

function harness() {
  const sent = [];
  const captured = [];
  const headerCalls = [];
  const respond = (res, code, body) => {
    sent.push({ res, code, body });
    return 'sent';
  };
  const errorTracker = {
    capture(error, request) {
      captured.push({ error, request });
    },
  };
  const res = {
    destroyed: false,
    setHeader(name, value) {
      headerCalls.push({ name, value });
    },
  };
  return {
    sent,
    captured,
    headerCalls,
    res,
    handler: createWorkbenchFailureHandler({ RequestBodyError, respond, errorTracker }),
  };
}

describe('ÆtherForge shared unhandled HTTP request boundary', () => {
  test.each([
    [408, 'Request body deadline exceeded'],
    [413, 'Request exceeds limit'],
    [503, 'Too many active body requests; retry later'],
  ])('retains expected %i response and original connection-close behavior', (status, message) => {
    const { res, sent, captured, headerCalls, handler } = harness();
    const request = { aborted: false, method: 'POST', url: '/api/run' };
    expect(handler(new RequestBodyError(status, message), request, res)).toBe('sent');
    expect(sent).toEqual([{ res, code: status, body: { error: message } }]);
    expect(captured).toEqual([]);
    expect(headerCalls).toEqual([
      { name: 'Connection', value: 'close' },
      ...(status === 503 ? [{ name: 'Retry-After', value: '1' }] : []),
    ]);
  });

  test.each([
    ['aborted request', { aborted: true }, { destroyed: false }],
    ['destroyed response', { aborted: false }, { destroyed: true }],
  ])('does not write to a %s or log a predictable abort', (_name, request, response) => {
    const { handler, sent, captured, headerCalls } = harness();
    const res = { setHeader: () => headerCalls.push('called'), ...response };
    expect(
      handler(new RequestBodyError(400, 'Request body was aborted'), request, res),
    ).toBeUndefined();
    expect(sent).toEqual([]);
    expect(captured).toEqual([]);
    expect(headerCalls).toEqual([]);
  });

  test('tracks an unexpected exception once and responds with the same sanitized 500', () => {
    const { res, sent, captured, headerCalls, handler } = harness();
    const error = new Error('never reflect this secret');
    const req = { method: 'GET', url: '/api/assets?private=do-not-log' };
    expect(handler(error, req, res)).toBe('sent');
    expect(captured).toEqual([{ error, request: req }]);
    expect(sent).toEqual([{ res, code: 500, body: { error: 'Workbench request failed' } }]);
    expect(JSON.stringify(sent)).not.toContain('never reflect this secret');
    expect(headerCalls).toEqual([]);
  });

  test('rejects incomplete handler wiring rather than silently skipping diagnostic capture', () => {
    expect(() =>
      createWorkbenchFailureHandler({ RequestBodyError, respond: null, errorTracker: {} }),
    ).toThrow('HTTP failure handler requires a body error type and responder');
    expect(() =>
      createWorkbenchFailureHandler({ RequestBodyError, respond: () => {}, errorTracker: null }),
    ).toThrow('HTTP failure handler requires an error tracker');
  });

  test.each([
    ['companion', createCompanion],
    ['commercial', createCommercial],
  ])(
    '%s retains sanitized live 500 responses and exactly one diagnostic',
    async (_name, factory) => {
      const captured = [];
      const server = factory({
        assetRoot: new URL('../../package.json', import.meta.url).pathname,
        errorTracker: {
          capture(error, request) {
            captured.push({ code: error.code, path: request.url });
          },
        },
      });
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      try {
        const base = `http://127.0.0.1:${server.address().port}`;
        const response = await fetch(base + '/api/assets?private=hidden');
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Workbench request failed' });
        expect(captured).toHaveLength(1);
      } finally {
        await new Promise((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    },
  );
});
