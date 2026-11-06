import { describe, expect, test } from '@jest/globals';

import { sanitizeRouteFailureContext } from '../../src/api/route-failure-schema.js';
import { createErrorReporter } from '../../src/observability/error-reporter.js';
import { getLogger } from '../../src/observability/json-logger.js';
import { isSensitiveDiagnosticKey } from '../../src/observability/sensitive-metadata.js';

const secretKeys = [
  'accessToken',
  'password',
  'api_key',
  'clientSecret',
  'authorization',
  'sessionId',
  'cookie',
  'Bearer',
  'privateKey',
  'credential',
];

describe('shared diagnostic sensitive-field classification', () => {
  test.each(secretKeys)('redacts the %s metadata key', (key) => {
    expect(isSensitiveDiagnosticKey(key)).toBe(true);
  });

  test.each(['requestId', 'retries', 'event', 'durationMs', 'region'])(
    'retains non-sensitive %s metadata classification',
    (key) => {
      expect(isSensitiveDiagnosticKey(key)).toBe(false);
    },
  );

  test('rejects non-string key inputs without coercion', () => {
    expect(isSensitiveDiagnosticKey(null)).toBe(false);
    expect(isSensitiveDiagnosticKey({ toString: () => 'accessToken' })).toBe(false);
    expect(isSensitiveDiagnosticKey(Symbol('password'))).toBe(false);
  });

  test('logger, error reporter and route failure context share the same redaction', () => {
    const metadata = Object.fromEntries(secretKeys.map((key) => [key, 'PRIVATE_VALUE']));
    metadata.requestId = 'safe-request';

    let logged = '';
    const logger = getLogger('diagnostic-test', {
      sink: {
        write(value) {
          logged = value;
        },
      },
      now: () => '2026-11-06T00:00:00.000Z',
    });
    logger.info(metadata, 'test event');
    const logRecord = JSON.parse(logged);

    let reportedContext;
    const reporter = createErrorReporter({
      capture(_error, context) {
        reportedContext = context;
      },
    });
    expect(reporter.capture(new Error('test'), metadata)).toBe(true);

    const routeContext = sanitizeRouteFailureContext(metadata);
    for (const sanitized of [logRecord, reportedContext, routeContext]) {
      expect(sanitized.requestId).toBe('safe-request');
      for (const key of secretKeys) {
        expect(Object.hasOwn(sanitized, key)).toBe(false);
      }
      expect(JSON.stringify(sanitized)).not.toContain('PRIVATE_VALUE');
    }
  });
});
