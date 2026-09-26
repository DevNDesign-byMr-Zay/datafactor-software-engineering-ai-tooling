import { afterEach, describe, expect, jest, test } from '@jest/globals';

const SOURCE = '../../src/promoted/signed-url-route.mjs';
let importId = 0;

async function loadRoute(bucket) {
  const registered = {};
  globalThis.bucket = bucket;
  globalThis.routeLogger = { error: jest.fn(), warn: jest.fn() };
  globalThis.app = {
    get: jest.fn((path, handler) => {
      registered.path = path;
      registered.handler = handler;
    }),
  };

  await import(`${SOURCE}?test=${importId++}`);
  return { ...registered, routeLogger: globalThis.routeLogger };
}

function responseHarness() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

afterEach(() => {
  delete globalThis.app;
  delete globalThis.bucket;
  delete globalThis.routeLogger;
  jest.restoreAllMocks();
});

describe('signed URL file access final route', () => {
  test('registers GET /sign', async () => {
    const route = await loadRoute({ file: jest.fn() });
    expect(route.path).toBe('/sign');
    expect(route.handler).toEqual(expect.any(Function));
  });

  test('rejects requests when the storage bucket is not configured', async () => {
    const { handler } = await loadRoute(null);
    const res = responseHarness();

    await handler({ query: { object: 'uploads/a.txt' } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Bucket not configured' });
  });

  test('requires a safe uploads object query parameter', async () => {
    const file = jest.fn();
    const { handler } = await loadRoute({ file });
    const res = responseHarness();

    await handler({ query: { object: '../private/a.txt' } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid ?object=' });
    expect(file).not.toHaveBeenCalled();
  });

  test('creates a one-hour read URL for the requested object', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const getSignedUrl = jest.fn().mockResolvedValue(['https://example.test/signed']);
    const file = jest.fn(() => ({ getSignedUrl }));
    const { handler } = await loadRoute({ file });
    const res = responseHarness();

    await handler({ query: { object: ' uploads/a.txt ' } }, res);

    expect(file).toHaveBeenCalledWith('uploads/a.txt');
    expect(getSignedUrl).toHaveBeenCalledWith({
      action: 'read',
      expires: 1_700_003_600_000,
    });
    expect(res.json).toHaveBeenCalledWith({ url: 'https://example.test/signed' });
  });

  test('sanitizes signing failures without returning provider details', async () => {
    const secret = 'signing-key=do-not-return';
    const error = new Error(secret);
    error.code = 'SIGNING_DOWN';
    const getSignedUrl = jest.fn().mockRejectedValue(error);
    const { handler, routeLogger } = await loadRoute({
      file: jest.fn(() => ({ getSignedUrl })),
    });
    const res = responseHarness();

    await handler({ query: { object: 'uploads/a.txt' } }, res);

    expect(routeLogger.error).toHaveBeenCalledWith(
      {
        schemaVersion: 1,
        event: 'sign.failed',
        errorName: 'Error',
        errorCode: 'SIGNING_DOWN',
      },
      'Signed URL generation failed',
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unable to create signed URL' });
    expect(JSON.stringify(routeLogger.error.mock.calls)).not.toContain(secret);
  });
});
