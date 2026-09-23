import { describe, expect, test } from '@jest/globals';

import {
  createRouteFailureRecord,
  isRouteFailureRecord,
  ROUTE_FAILURE_SCHEMA_VERSION,
  sanitizeRouteFailureContext,
} from '../../src/api/route-failure-schema.js';

describe('route failure schema boundary', () => {
  test('builds a bounded versioned failure record', () => {
    const error = new Error('provider detail must remain out of the record');
    error.code = 'UPSTREAM_DOWN';

    const record = createRouteFailureRecord({
      event: 'route.failed',
      error,
      context: {
        objectName: 'x'.repeat(300),
        attempt: 2,
        retryable: false,
        ignored: { nested: true },
      },
    });

    expect(record).toEqual({
      schemaVersion: ROUTE_FAILURE_SCHEMA_VERSION,
      event: 'route.failed',
      objectName: 'x'.repeat(256),
      attempt: 2,
      retryable: false,
      errorName: 'Error',
      errorCode: 'UPSTREAM_DOWN',
    });
    expect(Object.isFrozen(record)).toBe(true);
    expect(JSON.stringify(record)).not.toContain(error.message);
    expect(isRouteFailureRecord(record)).toBe(true);
  });

  test('drops unsupported nested context values', () => {
    expect(
      sanitizeRouteFailureContext({
        nullValue: null,
        booleanValue: true,
        numberValue: 3,
        textValue: 'ok',
        nested: { no: true },
        list: [1, 2],
      }),
    ).toEqual({
      nullValue: null,
      booleanValue: true,
      numberValue: 3,
      textValue: 'ok',
    });
  });

  test('rejects malformed schema records', () => {
    expect(isRouteFailureRecord(null)).toBe(false);
    expect(isRouteFailureRecord({ schemaVersion: 999, event: 'route.failed' })).toBe(false);
    expect(
      isRouteFailureRecord({
        schemaVersion: ROUTE_FAILURE_SCHEMA_VERSION,
        event: 'route.failed',
        nested: {},
      }),
    ).toBe(false);
  });
});
