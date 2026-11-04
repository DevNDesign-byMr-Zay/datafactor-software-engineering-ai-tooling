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

  test('refuses sensitive keys, record overrides, accessors and nonfinite values', () => {
    const context = Object.assign(Object.create(null), {
      schemaVersion: 999,
      event: 'spoofed.event',
      errorName: 'spoofed',
      errorCode: 'spoofed',
      accessToken: 'PRIVATE_TOKEN',
      api_key: 'PRIVATE_KEY',
      authorization: 'Bearer PRIVATE',
      password: 'PRIVATE_PASSWORD',
      requestId: 'safe-42',
      retries: 2,
      invalidFloat: Number.POSITIVE_INFINITY,
    });
    let getterCalls = 0;
    Object.defineProperty(context, 'surprise', {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error('accessor must never run');
      },
    });
    Object.defineProperty(context, '__proto__', { value: 'untrusted', enumerable: true });

    expect(sanitizeRouteFailureContext(context)).toEqual({
      requestId: 'safe-42',
      retries: 2,
    });
    const record = createRouteFailureRecord({ event: 'route.failed', context });
    expect(record).toEqual({
      schemaVersion: ROUTE_FAILURE_SCHEMA_VERSION,
      event: 'route.failed',
      requestId: 'safe-42',
      retries: 2,
    });
    expect(getterCalls).toBe(0);
    expect(JSON.stringify(record)).not.toContain('PRIVATE');
  });

  test('excludes unbounded error labels and invalid record numbers', () => {
    const error = new Error('message stays private');
    error.name = 'x'.repeat(200);
    error.code = 'y'.repeat(200);
    expect(createRouteFailureRecord({ event: 'route.failed', error })).toEqual({
      schemaVersion: ROUTE_FAILURE_SCHEMA_VERSION,
      event: 'route.failed',
    });
    expect(
      isRouteFailureRecord({
        schemaVersion: ROUTE_FAILURE_SCHEMA_VERSION,
        event: 'route.failed',
        elapsedMs: Number.NaN,
      }),
    ).toBe(false);
  });

  test('does not execute error name or code getters during failure recording', () => {
    let getterCalls = 0;
    const error = new TypeError('private upstream error text');
    Object.defineProperty(error, 'code', {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error('unsafe error code getter');
      },
    });
    const record = createRouteFailureRecord({ event: 'route.failed', error });
    expect(record).toEqual({
      schemaVersion: ROUTE_FAILURE_SCHEMA_VERSION,
      event: 'route.failed',
      errorName: 'TypeError',
    });
    expect(getterCalls).toBe(0);

    Object.defineProperty(error, 'name', {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error('unsafe error name getter');
      },
    });
    expect(createRouteFailureRecord({ event: 'route.failed', error })).toEqual({
      schemaVersion: ROUTE_FAILURE_SCHEMA_VERSION,
      event: 'route.failed',
    });
    expect(getterCalls).toBe(0);
  });

  test('contains throwing proxy metadata and retains the requested event', () => {
    const maliciousError = new Proxy(new Error('private error'), {
      get() {
        throw new Error('error property getter must not execute');
      },
      getOwnPropertyDescriptor() {
        throw new Error('metadata descriptor trap');
      },
    });
    const badContext = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('context enumerator trap');
        },
      },
    );
    expect(
      createRouteFailureRecord({
        event: 'route.failed',
        error: maliciousError,
        context: badContext,
      }),
    ).toEqual({
      schemaVersion: ROUTE_FAILURE_SCHEMA_VERSION,
      event: 'route.failed',
    });
    expect(sanitizeRouteFailureContext(badContext)).toEqual({});
  });

  test('checks arbitrary failure records without invoking accessors', () => {
    let getterCalls = 0;
    const candidate = { schemaVersion: ROUTE_FAILURE_SCHEMA_VERSION, event: 'route.failed' };
    Object.defineProperty(candidate, 'statusCode', {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error('record accessor should not execute');
      },
    });
    expect(isRouteFailureRecord(candidate)).toBe(false);
    expect(getterCalls).toBe(0);

    const inherited = Object.create({ schemaVersion: ROUTE_FAILURE_SCHEMA_VERSION });
    inherited.event = 'route.failed';
    expect(isRouteFailureRecord(inherited)).toBe(false);
    expect(
      isRouteFailureRecord({
        schemaVersion: ROUTE_FAILURE_SCHEMA_VERSION,
        event: 'route.failed',
        [Symbol('hidden')]: 'untrusted',
      }),
    ).toBe(false);
    expect(
      isRouteFailureRecord(
        new Proxy(
          {},
          {
            ownKeys() {
              throw new Error('proxy trap');
            },
          },
        ),
      ),
    ).toBe(false);
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
