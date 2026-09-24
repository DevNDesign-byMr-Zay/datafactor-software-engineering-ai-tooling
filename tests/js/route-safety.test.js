import { Buffer } from 'node:buffer';

import { describe, expect, jest, test } from '@jest/globals';

import {
  logRouteFailure,
  parseChatRequestBody,
  parseStorageObjectName,
  parseUploadFile,
} from '../../src/api/route-safety.js';

describe('route safety boundaries', () => {
  test('normalizes valid upload metadata without mutating the bytes', () => {
    const buffer = Buffer.from('hello');
    const result = parseUploadFile({
      originalname: '../project notes.txt',
      buffer,
      mimetype: ' Text/Plain ',
    });

    expect(result).toEqual({
      ok: true,
      value: {
        originalname: '_project_notes.txt',
        buffer,
        mimetype: 'text/plain',
      },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
  });

  test.each([
    [null, 'No file uploaded'],
    [
      { originalname: '', buffer: Buffer.from('x'), mimetype: 'text/plain' },
      'Invalid upload filename',
    ],
    [{ originalname: 'a.txt', buffer: 'x', mimetype: 'text/plain' }, 'Invalid upload body'],
    [
      { originalname: 'a.txt', buffer: Buffer.alloc(0), mimetype: 'text/plain' },
      'Upload size must be between 1 byte and 10 MiB',
    ],
    [
      { originalname: 'a.txt', buffer: Buffer.alloc(10 * 1024 * 1024 + 1), mimetype: 'text/plain' },
      'Upload size must be between 1 byte and 10 MiB',
    ],
    [
      { originalname: 'a.txt', buffer: Buffer.from('x'), mimetype: 'bad' },
      'Invalid upload MIME type',
    ],
  ])('rejects invalid uploads %#', (file, error) => {
    expect(parseUploadFile(file)).toEqual({ ok: false, error });
  });

  test('accepts trimmed upload object names and rejects traversal-shaped names', () => {
    expect(parseStorageObjectName(' uploads/a/file.txt ')).toEqual({
      ok: true,
      value: { objectName: 'uploads/a/file.txt' },
    });

    for (const objectName of [
      '../private/a.txt',
      'uploads/../private.txt',
      'uploads/a\\b.txt',
      'uploads//a.txt',
      'uploads/./a.txt',
      'uploads/a\u0000.txt',
      '',
    ]) {
      expect(parseStorageObjectName(objectName)).toEqual({
        ok: false,
        error: 'Invalid storage object',
      });
    }
    expect(parseStorageObjectName(null)).toEqual({
      ok: false,
      error: 'Invalid storage object',
    });
  });

  test('normalizes a valid chat body with bounded defaults', () => {
    const result = parseChatRequestBody({
      sessionId: ' session-1 ',
      text: ' hello ',
      files: [{ objectName: 'uploads/a.pdf' }],
    });

    expect(result).toEqual({
      ok: true,
      value: {
        sessionId: 'session-1',
        text: 'hello',
        files: [
          {
            objectName: 'uploads/a.pdf',
            mimeType: 'application/octet-stream',
          },
        ],
      },
    });
    expect(Object.isFrozen(result.value.files)).toBe(true);
    expect(Object.isFrozen(result.value.files[0])).toBe(true);
  });

  test.each([
    [null, 'Chat body must be an object'],
    [[], 'Chat body must be an object'],
    [{ text: 'hello', extra: true }, 'Chat body contains unsupported fields'],
    [{ sessionId: 4, text: 'hello' }, 'Invalid sessionId'],
    [{ sessionId: '', text: 'hello' }, 'Invalid sessionId'],
    [{ text: 7 }, 'Chat text must be a string'],
    [{ text: 'x'.repeat(12_001) }, 'Chat text is too long'],
    [{ text: 'hello', files: {} }, 'Chat files must be an array'],
    [{ text: 'hello', files: Array.from({ length: 9 }, () => ({})) }, 'Too many chat files'],
    [{ text: 'hello', files: [null] }, 'Invalid chat file reference'],
    [
      { text: 'hello', files: [{ objectName: 'uploads/a.pdf', extra: true }] },
      'Invalid chat file reference',
    ],
    [{ text: 'hello', files: [{ objectName: '../a.pdf' }] }, 'Invalid chat file reference'],
    [
      { text: 'hello', files: [{ objectName: 'uploads/a.pdf', mimeType: 'bad' }] },
      'Invalid chat file MIME type',
    ],
    [{}, 'Chat requires text or a file'],
  ])('rejects invalid chat bodies %#', (body, error) => {
    expect(parseChatRequestBody(body)).toEqual({ ok: false, error });
  });
});

describe('structured route failure logging', () => {
  test('logs only bounded context plus error name/code', () => {
    const logger = { error: jest.fn() };
    const error = new Error('raw secret should not be logged');
    error.code = 'UPSTREAM_DOWN';

    expect(
      logRouteFailure({
        logger,
        event: 'route.failed',
        message: 'Route failed',
        error,
        context: {
          objectName: 'x'.repeat(300),
          attempt: 2,
          retryable: false,
          ignored: { nested: true },
        },
      }),
    ).toBe(true);

    expect(logger.error).toHaveBeenCalledWith(
      {
        schemaVersion: 1,
        event: 'route.failed',
        objectName: 'x'.repeat(256),
        attempt: 2,
        retryable: false,
        errorName: 'Error',
        errorCode: 'UPSTREAM_DOWN',
      },
      'Route failed',
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(error.message);
  });

  test('forwards bounded route failure metadata to an optional reporter', () => {
    const logger = { error: jest.fn() };
    const capture = jest.fn();
    const error = new Error('private upstream detail');

    expect(
      logRouteFailure({
        logger,
        errorReporter: { capture },
        event: 'route.failed',
        error,
        context: { requestId: 'x'.repeat(300), nested: { ignored: true } },
      }),
    ).toBe(true);

    expect(capture).toHaveBeenCalledWith(error, {
      schemaVersion: 1,
      event: 'route.failed',
      requestId: 'x'.repeat(256),
      errorName: 'Error',
    });
  });

  test('supports warning sinks and treats missing or broken loggers as non-fatal', () => {
    const warn = jest.fn();
    expect(
      logRouteFailure({
        logger: { warn },
        level: 'warn',
        event: 'route.warning',
        context: { value: null },
      }),
    ).toBe(true);
    expect(warn).toHaveBeenCalledWith(
      { schemaVersion: 1, event: 'route.warning', value: null },
      'Route operation failed',
    );

    expect(logRouteFailure({ logger: null, event: 'route.failed' })).toBe(false);
    expect(
      logRouteFailure({
        logger: {
          error() {
            throw new Error('logger down');
          },
        },
        event: 'route.failed',
      }),
    ).toBe(false);
  });

  test('requires an event name', () => {
    expect(() => logRouteFailure({ logger: { error: jest.fn() } })).toThrow('event is required');
  });

  test('rejects unsupported log levels before touching the sink', () => {
    const logger = { error: jest.fn() };
    expect(() =>
      logRouteFailure({
        logger,
        level: 'trace',
        event: 'route.failed',
      }),
    ).toThrow('level must be one of: error, warn, info');
    expect(logger.error).not.toHaveBeenCalled();
  });
});
