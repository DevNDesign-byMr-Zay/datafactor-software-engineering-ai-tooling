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
