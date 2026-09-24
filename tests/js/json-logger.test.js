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

  test('rejects invalid logger construction inputs', () => {
    expect(() => getLogger('')).toThrow(/logger name/);
    expect(() => getLogger('valid', { sink: {} })).toThrow(/sink/);
  });
});
