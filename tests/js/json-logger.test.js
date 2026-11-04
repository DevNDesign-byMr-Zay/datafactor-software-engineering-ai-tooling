import { describe, expect, test } from '@jest/globals';

import { getLogger } from '../../src/observability/json-logger.js';

function capture() {
  const lines = [];
  return {
    lines,
    sink: {
      write(line) {
        lines.push(line);
      },
    },
  };
}

describe('structured JavaScript logger', () => {
  test('emits timestamp, level, logger, message, event, and bounded metadata', () => {
    const { lines, sink } = capture();
    const logger = getLogger('route-safety', {
      sink,
      now: () => '2026-09-24T20:00:00.000Z',
    });

    logger.warn(
      {
        event: 'route.warning',
        requestId: 'r'.repeat(300),
        retryable: false,
      },
      'Route warning',
    );

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toEqual({
      timestamp: '2026-09-24T20:00:00.000Z',
      level: 'warn',
      logger: 'route-safety',
      message: 'Route warning',
      event: 'route.warning',
      requestId: 'r'.repeat(256),
      retryable: false,
    });
  });

  test('uses one logger instance without handler accumulation', () => {
    const { lines, sink } = capture();
    const logger = getLogger('maintained-runtime', {
      sink,
      now: () => '2026-09-24T20:00:00.000Z',
    });

    logger.info({ event: 'first' }, 'First');
    logger.info({ event: 'second' }, 'Second');

    expect(lines).toHaveLength(2);
    expect(lines.map((line) => JSON.parse(line).event)).toEqual(['first', 'second']);
  });

  test('metadata cannot replace the trusted log envelope', () => {
    const { lines, sink } = capture();
    const logger = getLogger('route-safety', {
      sink,
      now: () => '2026-10-27T17:00:00.000Z',
    });

    logger.error(
      {
        timestamp: 'forged',
        level: 'info',
        logger: 'forged',
        message: 'forged',
        event: 'route.failed',
      },
      'Route operation failed',
    );

    expect(JSON.parse(lines[0])).toEqual({
      timestamp: '2026-10-27T17:00:00.000Z',
      level: 'error',
      logger: 'route-safety',
      message: 'Route operation failed',
      event: 'route.failed',
    });
  });

  test('does not read accessor metadata, secret fields or inherited values', () => {
    const { lines, sink } = capture();
    const logger = getLogger('route-safety', {
      sink,
      now: () => '2026-11-03T07:00:00.000Z',
    });
    const data = Object.assign(Object.create({ inherited: 'PRIVATE_INHERITED' }), {
      event: 'route.failed',
      requestId: 'safe-id',
      accessToken: 'PRIVATE_TOKEN',
      api_key: 'PRIVATE_KEY',
      cookie: 'PRIVATE_COOKIE',
      retries: 2,
      invalidFloat: Number.POSITIVE_INFINITY,
    });
    let getterCalls = 0;
    Object.defineProperty(data, 'queryGetter', {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error('getter should not execute');
      },
    });
    Object.defineProperty(data, '__proto__', {
      enumerable: true,
      value: 'PRIVATE_PROTOTYPE',
    });

    logger.error(data, 'Route failed');
    expect(getterCalls).toBe(0);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toEqual({
      timestamp: '2026-11-03T07:00:00.000Z',
      level: 'error',
      logger: 'route-safety',
      message: 'Route failed',
      event: 'route.failed',
      requestId: 'safe-id',
      retries: 2,
    });
    expect(lines[0]).not.toContain('PRIVATE_');
  });

  test('emits the trusted envelope when proxy metadata throws', () => {
    const { lines, sink } = capture();
    const logger = getLogger('route-safety', {
      sink,
      now: () => '2026-11-03T07:00:00.000Z',
    });
    const invalidMetadata = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('metadata trap');
        },
      },
    );
    expect(() => logger.warn(invalidMetadata, 'Failure details unavailable')).not.toThrow();
    expect(JSON.parse(lines[0])).toEqual({
      timestamp: '2026-11-03T07:00:00.000Z',
      level: 'warn',
      logger: 'route-safety',
      message: 'Failure details unavailable',
    });
  });

  test('rejects invalid logger construction inputs', () => {
    expect(() => getLogger('')).toThrow(/logger name/);
    expect(() => getLogger('valid', { sink: {} })).toThrow(/sink/);
  });
});
