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
    createTokenAuthMiddleware('secret')(
      { method: 'OPTIONS', header: jest.fn() },
      optionsRes,
      next,
    );
    expect(optionsRes.sendStatus).toHaveBeenCalledWith(204);

    const allowedRes = responseDouble();
    createTokenAuthMiddleware('secret')(
      { method: 'POST', header: () => 'secret' },
      allowedRes,
      next,
    );
    expect(next).toHaveBeenCalled();

    const deniedRes = responseDouble();
    createTokenAuthMiddleware('')(
      { method: 'POST', header: () => '' },
      deniedRes,
      jest.fn(),
    );
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
    expect(error.message).toContain('https://denied.example');
    expect(policy.options.credentials).toBe(true);
  });

  test('converts CORS errors to 403 and propagates unrelated failures', () => {
    const policy = createCorsPolicy();
    const res = responseDouble();
    const next = jest.fn();

    policy.errorHandler(new Error('Not allowed by CORS: x'), {}, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not allowed by CORS: x' });

    const unrelated = new Error('boom');
    policy.errorHandler(unrelated, {}, responseDouble(), next);
    expect(next).toHaveBeenCalledWith(unrelated);
  });
});
