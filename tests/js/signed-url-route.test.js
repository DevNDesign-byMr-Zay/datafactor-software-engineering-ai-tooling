import { afterEach, describe, expect, jest, test } from '@jest/globals';

const SOURCE =
  '../../Software Engineering & AI Tooling/Storage & File Services/Signed URL File Access/06 FINAL CORRECTED CODE/sign_route.mjs';
let importId = 0;

async function loadRoute(bucket) {
  const registered = {};
  globalThis.bucket = bucket;
  globalThis.app = {
    get: jest.fn((path, handler) => {
      registered.path = path;
      registered.handler = handler;
    }),
  };

  await import(`${SOURCE}?test=${importId++}`);
  return registered;
}

function responseHarness() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

afterEach(() => {
  delete globalThis.app;
  delete globalThis.bucket;
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

  test('requires an object query parameter', async () => {
    const { handler } = await loadRoute({ file: jest.fn() });
    const res = responseHarness();

    await handler({ query: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing ?object=' });
  });

  test('creates a one-hour read URL for the requested object', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const getSignedUrl = jest.fn().mockResolvedValue(['https://example.test/signed']);
    const file = jest.fn(() => ({ getSignedUrl }));
    const { handler } = await loadRoute({ file });
    const res = responseHarness();

    await handler({ query: { object: 'uploads/a.txt' } }, res);

    expect(file).toHaveBeenCalledWith('uploads/a.txt');
    expect(getSignedUrl).toHaveBeenCalledWith({
      action: 'read',
      expires: 1_700_003_600_000,
    });
    expect(res.json).toHaveBeenCalledWith({ url: 'https://example.test/signed' });
  });

  test('returns a signing error when URL generation fails', async () => {
    const error = new Error('signing failed');
    const getSignedUrl = jest.fn().mockRejectedValue(error);
    const { handler } = await loadRoute({
      file: jest.fn(() => ({ getSignedUrl })),
    });
    const res = responseHarness();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await handler({ query: { object: 'uploads/a.txt' } }, res);

    expect(consoleError).toHaveBeenCalledWith('Sign error:', error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'signing failed' });
  });
});
