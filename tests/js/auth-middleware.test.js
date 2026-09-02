import { afterEach, describe, expect, jest, test } from '@jest/globals';

const SOURCE =
  '../../Software Engineering & AI Tooling/Authentication & Security/Token Authentication Regression/06 FINAL CORRECTED CODE/auth_middleware.mjs';
let importId = 0;
const originalToken = process.env.APP_API_TOKEN;

async function loadMiddleware(token) {
  if (token === undefined) delete process.env.APP_API_TOKEN;
  else process.env.APP_API_TOKEN = token;

  const registered = [];
  globalThis.app = { use: jest.fn((middleware) => registered.push(middleware)) };
  await import(`${SOURCE}?test=${importId++}`);
  return registered[0];
}

function responseHarness() {
  const res = {
    sendStatus: jest.fn(),
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

afterEach(() => {
  delete globalThis.app;
  if (originalToken === undefined) delete process.env.APP_API_TOKEN;
  else process.env.APP_API_TOKEN = originalToken;
});

describe('token authentication regression final middleware', () => {
  test('allows preflight OPTIONS requests without requiring a token', async () => {
    const middleware = await loadMiddleware('secret');
    const req = { method: 'OPTIONS', header: jest.fn() };
    const res = responseHarness();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.sendStatus).toHaveBeenCalledWith(204);
    expect(req.header).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test('allows a matching x-app-token when a server token is configured', async () => {
    const middleware = await loadMiddleware('secret');
    const req = { method: 'POST', header: jest.fn(() => 'secret') };
    const res = responseHarness();
    const next = jest.fn();

    middleware(req, res, next);

    expect(req.header).toHaveBeenCalledWith('x-app-token');
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test.each(['wrong', undefined])('rejects a non-matching token: %p', async (value) => {
    const middleware = await loadMiddleware('secret');
    const req = { method: 'POST', header: jest.fn(() => value) };
    const res = responseHarness();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  test('fails closed when APP_API_TOKEN is not configured', async () => {
    const middleware = await loadMiddleware(undefined);
    const req = { method: 'GET', header: jest.fn(() => '') };
    const res = responseHarness();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
