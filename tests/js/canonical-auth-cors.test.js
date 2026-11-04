import { jest } from '@jest/globals';

import { createCorsPolicy } from '../../src/api/cors-policy.js';
import { createTokenAuthMiddleware } from '../../src/auth/token-auth.js';

function responseDouble() {
  return {
    sendStatus: jest.fn((status) => status),
    status: jest.fn(function status(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn((payload) => payload),
  };
}

describe('canonical token auth adapter', () => {
  test('allows OPTIONS and matching tokens while rejecting missing configuration', () => {
    const next = jest.fn();
    const optionsRes = responseDouble();
    createTokenAuthMiddleware('secret')({ method: 'OPTIONS', header: jest.fn() }, optionsRes, next);
    expect(optionsRes.sendStatus).toHaveBeenCalledWith(204);

    const allowedRes = responseDouble();
    createTokenAuthMiddleware('secret')(
      { method: 'POST', header: () => 'secret' },
      allowedRes,
      next,
    );
    expect(next).toHaveBeenCalled();

    const deniedRes = responseDouble();
    createTokenAuthMiddleware('')({ method: 'POST', header: () => '' }, deniedRes, jest.fn());
    expect(deniedRes.status).toHaveBeenCalledWith(401);
    expect(deniedRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });
});

describe('canonical CORS adapter', () => {
  test('accepts no-origin and allowlisted origins and rejects others', () => {
    const policy = createCorsPolicy(['https://allowed.example']);
    const callback = jest.fn();

    policy.options.origin(undefined, callback);
    expect(callback).toHaveBeenLastCalledWith(null, true);

    policy.options.origin('https://allowed.example', callback);
    expect(callback).toHaveBeenLastCalledWith(null, true);

    policy.options.origin('https://denied.example', callback);
    const [error] = callback.mock.lastCall;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Not allowed by CORS');
    expect(policy.options.credentials).toBe(true);
  });

  test('converts CORS errors to 403 and propagates unrelated failures', () => {
    const policy = createCorsPolicy();
    const res = responseDouble();
    const next = jest.fn();

    policy.errorHandler(new Error('Not allowed by CORS: x'), {}, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not allowed by CORS' });

    const unrelated = new Error('boom');
    policy.errorHandler(unrelated, {}, responseDouble(), next);
    expect(next).toHaveBeenCalledWith(unrelated);
  });
});

describe('credential and origin refusal hardening', () => {
  test.each([null, undefined, ''])(
    'fails closed for missing token configuration %#',
    (configuration) => {
      const header = jest.fn(() => String(configuration));
      const response = responseDouble();
      const next = jest.fn();
      createTokenAuthMiddleware(configuration)(
        { method: 'POST', header },
        response,
        next,
      );
      expect(response.status).toHaveBeenCalledWith(401);
      expect(response.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(header).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    },
  );

  test('contains header adapter failures without granting access or leaking details', () => {
    const next = jest.fn();
    const response = responseDouble();
    const middleware = createTokenAuthMiddleware('configured-secret');

    expect(() =>
      middleware(
        {
          method: 'POST',
          header() {
            throw new Error('PRIVATE_HEADER_ERROR');
          },
        },
        response,
        next,
      ),
    ).not.toThrow();
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(JSON.stringify(response.json.mock.calls)).not.toContain('PRIVATE_');
    expect(next).not.toHaveBeenCalled();
  });

  test('preserves explicitly configured non-null scalar tokens', () => {
    const next = jest.fn();
    const response = responseDouble();
    createTokenAuthMiddleware(0)(
      { method: 'POST', header: () => '0' },
      response,
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('compares UTF-8 token bytes and rejects near matches without revealing tokens', () => {
    const goodToken = 'secrét-private';
    const middleware = createTokenAuthMiddleware(goodToken);
    const ok = responseDouble();
    const success = jest.fn();
    middleware({ method: 'POST', header: () => goodToken }, ok, success);
    expect(success).toHaveBeenCalledTimes(1);

    for (const value of ['secrét-privat', 'secrét-private-extra', 'secret-private', '']) {
      const denied = responseDouble();
      const next = jest.fn();
      middleware({ method: 'POST', header: () => value }, denied, next);
      expect(denied.status).toHaveBeenCalledWith(401);
      expect(denied.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
      expect(JSON.stringify(denied.json.mock.calls)).not.toContain(goodToken);
    }
  });

  test('rejects disallowed origin without reflecting supplied query strings or tokens', () => {
    const origin = 'https://denied.example/?token=private-token';
    const validator = createCorsPolicy(['https://allowed.example']);
    const callback = jest.fn();
    validator.options.origin(origin, callback);
    const [error] = callback.mock.lastCall;
    expect(error.message).toBe('Not allowed by CORS');
    expect(error.message).not.toContain('private-token');
    const response = responseDouble();
    validator.errorHandler(error, {}, response, jest.fn());
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ error: 'Not allowed by CORS' });
    expect(JSON.stringify(response.json.mock.calls)).not.toContain('private-token');
  });
});
