import { afterEach, describe, expect, jest, test } from '@jest/globals';

const SOURCE =
  '../../Software Engineering & AI Tooling/API Foundations/Express Gemini Backend Foundation/06 FINAL CORRECTED CODE/cors_policy.mjs';
let importId = 0;
const originalOrigins = process.env.ALLOWED_ORIGINS;

async function loadPolicy(origins = '') {
  process.env.ALLOWED_ORIGINS = origins;
  const uses = [];
  const cors = jest.fn((options) => ({ kind: 'cors-middleware', options }));
  globalThis.cors = cors;
  globalThis.app = { use: jest.fn((middleware) => uses.push(middleware)) };

  await import(`${SOURCE}?test=${importId++}`);

  return {
    cors,
    corsMiddleware: uses[0],
    errorMiddleware: uses[1],
    options: cors.mock.calls[0][0],
  };
}

function responseHarness() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

afterEach(() => {
  delete globalThis.app;
  delete globalThis.cors;
  if (originalOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
  else process.env.ALLOWED_ORIGINS = originalOrigins;
});

describe('Express Gemini backend CORS policy final artifact', () => {
  test('normalizes the configured allowlist and enables credentials', async () => {
    const { options } = await loadPolicy(' https://a.example , ,https://b.example ');

    expect(options.credentials).toBe(true);
    const cb = jest.fn();
    options.origin('https://b.example', cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  test('allows requests without an Origin header', async () => {
    const { options } = await loadPolicy('https://a.example');
    const cb = jest.fn();

    options.origin(undefined, cb);

    expect(cb).toHaveBeenCalledWith(null, true);
  });

  test('rejects origins outside the configured allowlist', async () => {
    const { options } = await loadPolicy('https://a.example');
    const cb = jest.fn();

    options.origin('https://blocked.example', cb);

    const [error] = cb.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Not allowed by CORS: https://blocked.example');
  });

  test('turns CORS policy errors into a structured 403 response', async () => {
    const { errorMiddleware } = await loadPolicy('https://a.example');
    const res = responseHarness();
    const next = jest.fn();
    const error = new Error('Not allowed by CORS: https://blocked.example');

    errorMiddleware(error, {}, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: error.message });
    expect(next).not.toHaveBeenCalled();
  });

  test('passes unrelated errors to the next error handler', async () => {
    const { errorMiddleware } = await loadPolicy('https://a.example');
    const res = responseHarness();
    const next = jest.fn();
    const error = new Error('database failed');

    errorMiddleware(error, {}, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
