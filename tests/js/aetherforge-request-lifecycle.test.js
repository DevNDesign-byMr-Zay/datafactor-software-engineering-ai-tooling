import { request } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorkbenchServer as commercial } from '../../apps/aetherforge-commercial/server.mjs';
import { createWorkbenchServer as companion } from '../../apps/aetherforge-workbench/server.mjs';

const routes = [
  ['companion workflow', companion, 'POST', '/api/run', 65536, 'application/json'],
  ['commercial workflow', commercial, 'POST', '/api/run', 65536, 'application/json'],
  ['companion upload', companion, 'POST', '/api/assets/upload', 6291456, 'image/png'],
  ['commercial upload', commercial, 'POST', '/api/assets/upload', 6291456, 'image/png'],
  [
    'commercial project save',
    commercial,
    'PUT',
    '/api/workspace/projects/deadline-test',
    1800000,
    'application/json',
  ],
  [
    'commercial source execution',
    commercial,
    'POST',
    '/api/execution/run',
    35000,
    'application/json',
  ],
  [
    'commercial project execution',
    commercial,
    'POST',
    '/api/execution/project',
    76000,
    'application/json',
  ],
];

const brushWorkflow = JSON.stringify({
  action: 'brush',
  inputs: { brushSize: 20, shape: 'circle', feather: 0, distance: 10 },
});

function runBrush(origin) {
  return fetch(origin + '/api/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: brushWorkflow,
  });
}

async function withServer(factory, work, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'aetherforge-request-'));
  const failures = [];
  const server = factory({
    assetRoot: join(directory, 'assets'),
    workspaceRoot: join(directory, 'projects'),
    requestBodyTimeoutMs: 80,
    errorTracker: {
      capture: (error, req) =>
        failures.push({ name: error.name, method: req.method, url: req.url }),
    },
    ...options,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  try {
    await work({ server, origin, failures });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
}

function openRequest(origin, method, path, type, extraHeaders = {}) {
  let req;
  let guard;
  const response = new Promise((resolve, reject) => {
    req = request(
      origin + path,
      {
        method,
        agent: false,
        headers: {
          connection: 'keep-alive',
          'content-type': type,
          'x-aetherforge-local': '1',
          ...extraHeaders,
        },
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (raw += chunk));
        res.on('error', reject);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(raw) });
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    req.on('error', reject);
    guard = setTimeout(() => {
      reject(new Error('The maintained server did not finish the incomplete request'));
      req.destroy();
    }, 1500);
  }).finally(() => clearTimeout(guard));
  return { req, response };
}

describe.each(routes)('%s body lifecycle', (_name, factory, method, path, limit, type) => {
  test('enforces a total body deadline even while bytes continue arriving', async () => {
    await withServer(factory, async ({ origin, failures }) => {
      const { req, response } = openRequest(origin, method, path, type);
      req.write(' ');
      const drip = setInterval(() => req.write(' '), 10);
      try {
        const result = await response;
        expect(result.status).toBe(408);
        expect(result.body.error).toEqual(expect.any(String));
        expect(result.headers.connection).toBe('close');
        const health = await fetch(origin + '/api/health');
        expect(health.status).toBe(200);
        expect(failures).toEqual([]);
        expect((await (await fetch(origin + '/api/assets')).json()).assets).toEqual([]);
      } finally {
        clearInterval(drip);
        req.destroy();
      }
    });
  });

  test('rejects an oversized declared body without waiting for its remaining bytes', async () => {
    await withServer(factory, async ({ origin, failures }) => {
      const { req, response } = openRequest(origin, method, path, type, {
        'content-length': limit + 1,
      });
      req.write(' ');
      try {
        const result = await response;
        expect(result.status).toBe(413);
        expect(result.headers.connection).toBe('close');
        expect(failures).toEqual([]);
      } finally {
        req.destroy();
      }
    });
  });

  test('bounds chunked bodies without requiring an end-of-body marker', async () => {
    await withServer(
      factory,
      async ({ origin, failures }) => {
        const { req, response } = openRequest(origin, method, path, type);
        req.write(Buffer.alloc(limit + 1, ' '));
        try {
          const result = await response;
          expect(result.status).toBe(413);
          expect(result.headers.connection).toBe('close');
          expect(failures).toEqual([]);
        } finally {
          req.destroy();
        }
      },
      { requestBodyTimeoutMs: 1000 },
    );
  });

  test('contains client aborts without reporting an internal server failure', async () => {
    await withServer(factory, async ({ server, origin, failures }) => {
      const incoming = new Promise((resolve) => server.once('request', resolve));
      const { req, response } = openRequest(origin, method, path, type);
      // A client intentionally destroying its request is expected in this test.
      const responseFinished = response.catch(() => undefined);
      req.write(' ');
      const requestAtServer = await incoming;
      const closed = new Promise((resolve) => requestAtServer.once('close', resolve));
      req.destroy();
      await closed;
      await responseFinished;
      expect((await fetch(origin + '/api/health')).status).toBe(200);
      expect(failures).toEqual([]);
      expect((await (await fetch(origin + '/api/assets')).json()).assets).toEqual([]);
    });
  });
});

describe.each([
  ['companion', companion],
  ['commercial', commercial],
])('%s request admission', (_name, factory) => {
  test('bounds active body requests and releases capacity after a client abort', async () => {
    await withServer(
      factory,
      async ({ server, origin, failures }) => {
        const incoming = new Promise((resolve) => server.once('request', resolve));
        const { req, response } = openRequest(origin, 'POST', '/api/assets/upload', 'image/png');
        const responseFinished = response.catch(() => undefined);
        req.write('partial upload');
        const pending = await incoming;
        try {
          const overloaded = await runBrush(origin);
          expect(overloaded.status).toBe(503);
          expect(overloaded.headers.get('retry-after')).toBe('1');
          await overloaded.json();
          expect((await fetch(origin + '/api/health')).status).toBe(200);
          const closed = new Promise((resolve) => pending.once('close', resolve));
          req.destroy();
          await closed;
          await responseFinished;
          const accepted = await runBrush(origin);
          expect(accepted.status).toBe(200);
          expect((await accepted.json()).status).toBe('computed');
          expect(failures).toEqual([]);
        } finally {
          req.destroy();
          await responseFinished;
        }
      },
      { requestBodyTimeoutMs: 1000, maxConcurrentBodyRequests: 1 },
    );
  });

  test('releases capacity after a deadline and after a successful response', async () => {
    await withServer(
      factory,
      async ({ origin, failures }) => {
        const { req, response } = openRequest(origin, 'POST', '/api/run', 'application/json');
        req.write('{');
        try {
          expect((await response).status).toBe(408);
          for (let attempt = 0; attempt < 2; attempt += 1) {
            const accepted = await runBrush(origin);
            expect(accepted.status).toBe(200);
            expect((await accepted.json()).status).toBe('computed');
          }
          expect(failures).toEqual([]);
        } finally {
          req.destroy();
        }
      },
      { maxConcurrentBodyRequests: 1 },
    );
  });

  test.each([0, -1, NaN, Infinity, 300001])('rejects an unsafe timeout of %s', (timeout) => {
    expect(() => factory({ requestBodyTimeoutMs: timeout })).toThrow(RangeError);
  });
  test.each([0, -1, 1.5, NaN, Infinity, 65])(
    'rejects an unsafe concurrency limit of %s',
    (limit) => {
      expect(() => factory({ maxConcurrentBodyRequests: limit })).toThrow(RangeError);
    },
  );
});
