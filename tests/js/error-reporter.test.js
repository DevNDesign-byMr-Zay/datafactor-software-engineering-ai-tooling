import { describe, expect, jest, test } from '@jest/globals';

import { createErrorReporter } from '../../src/observability/error-reporter.js';

describe('provider-neutral JavaScript error reporter', () => {
  test('is a no-op until a deployment supplies a capture callback', () => {
    const reporter = createErrorReporter();
    expect(reporter.capture(new Error('ignored'), { scope: 'route' })).toBe(false);
  });

  test('forwards the original error with frozen bounded metadata', () => {
    const capture = jest.fn();
    const reporter = createErrorReporter({ capture });
    const error = new Error('upstream detail');

    expect(
      reporter.capture(error, {
        event: 'route.failed',
        requestId: 'r'.repeat(300),
        retryable: false,
        nested: { ignored: true },
      }),
    ).toBe(true);

    expect(capture).toHaveBeenCalledTimes(1);
    const [capturedError, context] = capture.mock.calls[0];
    expect(capturedError).toBe(error);
    expect(context).toEqual({
      event: 'route.failed',
      requestId: 'r'.repeat(256),
      retryable: false,
    });
    expect(Object.isFrozen(context)).toBe(true);
  });

  test('filters sensitive fields and never executes metadata accessors', () => {
    const capture = jest.fn();
    const reporter = createErrorReporter({ capture });
    const context = Object.assign(Object.create(null), {
      event: 'route.failed',
      requestId: 'safe-id',
      authToken: 'PRIVATE_TOKEN',
      api_key: 'PRIVATE_API_KEY',
      cookie: 'PRIVATE_COOKIE',
      sessionId: 'PRIVATE_SESSION',
      retries: 2,
      invalidNumber: Number.POSITIVE_INFINITY,
    });
    let getterCalls = 0;
    Object.defineProperty(context, 'surprise', {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error('getter should not run');
      },
    });
    Object.defineProperty(context, '__proto__', {
      value: 'not-an-object-prototype',
      enumerable: true,
    });

    expect(reporter.capture(new Error('private detail'), context)).toBe(true);
    expect(capture).toHaveBeenCalledTimes(1);
    const received = capture.mock.calls[0][1];
    expect(received).toEqual({ event: 'route.failed', requestId: 'safe-id', retries: 2 });
    expect(Object.isFrozen(received)).toBe(true);
    expect(getterCalls).toBe(0);
    expect(JSON.stringify(received)).not.toContain('PRIVATE_');
  });

  test('does not read inherited context properties', () => {
    const capture = jest.fn();
    const reporter = createErrorReporter({ capture });
    const context = Object.create({ inheritedToken: 'PRIVATE_TOKEN' });
    context.requestId = 'safe-id';
    expect(reporter.capture(new Error('private'), context)).toBe(true);
    expect(capture.mock.calls[0][1]).toEqual({ requestId: 'safe-id' });
  });

  test('contains invalid context and proxy descriptor failures', () => {
    const capture = jest.fn();
    const reporter = createErrorReporter({ capture });
    const throwingProxy = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('untrusted proxy');
        },
      },
    );
    expect(reporter.capture(new Error('private'), throwingProxy)).toBe(false);
    expect(reporter.capture(new Error('private'), [])).toBe(false);
    expect(capture).not.toHaveBeenCalled();
  });

  test('contains both synchronous and asynchronous failures of fallback logging', async () => {
    const failingLogger = {
      warn() {
        throw new Error('logger unavailable');
      },
    };
    const syncReporter = createErrorReporter({
      capture() {
        throw new Error('callback unavailable');
      },
      logger: failingLogger,
    });
    expect(syncReporter.capture(new Error('route.failed'))).toBe(false);

    const asyncReporter = createErrorReporter({
      capture() {
        return Promise.reject(new Error('callback unavailable'));
      },
      logger: failingLogger,
    });
    expect(asyncReporter.capture(new Error('route.failed'))).toBe(true);
    await new Promise((resolve) => setImmediate(resolve));
  });

  test('bounds the failure error name independently of fallback logging', () => {
    const warn = jest.fn();
    const reporter = createErrorReporter({
      capture() {
        const failure = new Error('private data');
        failure.name = 'PRIVATE_' + 'x'.repeat(200);
        throw failure;
      },
      logger: { warn },
    });
    expect(reporter.capture(new Error('request'))).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      { event: 'error_reporter.failed', errorName: 'Error' },
      'Error reporter failed',
    );
  });

  test('contains reporter failures without leaking the reporter error', async () => {
    const warn = jest.fn();
    const logger = { warn };
    const reporter = createErrorReporter({
      capture() {
        throw new Error('telemetry secret');
      },
      logger,
    });

    expect(reporter.capture(new Error('route failed'), { scope: 'route' })).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      { event: 'error_reporter.failed', errorName: 'Error' },
      'Error reporter failed',
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain('telemetry secret');
  });
});
