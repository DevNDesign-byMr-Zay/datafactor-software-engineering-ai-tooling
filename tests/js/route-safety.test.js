import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

import { describe, expect, jest, test } from '@jest/globals';

import {
  logRouteFailure,
  parseChatRequestBody,
  parseStorageObjectName,
  parseUploadFile,
  validateChatRequestBody,
  validateStorageObjectName,
  validateUploadFile,
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

  test('ignores extra Multer fields and preserves the exact supplied bytes', () => {
    const buffer = Buffer.from('image');
    const parsed = parseUploadFile({
      originalname: 'reference.png',
      buffer,
      mimetype: 'image/png',
      fieldname: 'upload',
      encoding: '7bit',
      size: buffer.length,
    });
    expect(parsed.ok).toBe(true);
    expect(parsed.value).toEqual({
      originalname: 'reference.png',
      buffer,
      mimetype: 'image/png',
    });
    expect(parsed.value.buffer).toBe(buffer);
  });

  test('rejects inherited upload fields without trusting prototype values', () => {
    const inheritedFile = Object.create({
      originalname: 'inherited.txt',
      buffer: Buffer.from('x'),
      mimetype: 'text/plain',
    });
    expect(parseUploadFile(inheritedFile)).toEqual({
      ok: false,
      error: 'Invalid upload filename',
    });
  });

  test('does not invoke accessor properties in uploaded file metadata', () => {
    let getterCalls = 0;
    const goodBytes = Buffer.from('safe');
    const fields = ['originalname', 'buffer', 'mimetype'];
    for (const field of fields) {
      const file = {
        originalname: 'normal.txt',
        buffer: goodBytes,
        mimetype: 'text/plain',
      };
      Object.defineProperty(file, field, {
        enumerable: true,
        get() {
          getterCalls += 1;
          throw new Error('untrusted upload getter');
        },
      });
      const parsed = parseUploadFile(file);
      expect(parsed.ok).toBe(false);
    }
    expect(getterCalls).toBe(0);
  });

  test('rejects throwing upload proxies and arrays without reading their fields', () => {
    const untrusted = new Proxy({}, {
      ownKeys() {
        throw new Error('untrusted metadata');
      },
    });
    expect(parseUploadFile(untrusted)).toEqual({
      ok: false,
      error: 'Invalid upload filename',
    });
    expect(parseUploadFile([])).toEqual({ ok: false, error: 'No file uploaded' });
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

  test('rejects inherited chat fields without reading their values', () => {
    const inherited = Object.create({ sessionId: 'inherited', text: 'stolen text' });
    expect(parseChatRequestBody(inherited)).toEqual({
      ok: false,
      error: 'Chat body contains unsupported fields',
    });
    // A plain JSON object must not see polluted prototype fields either.
    const body = { text: 'real' };
    expect(parseChatRequestBody(body).value.sessionId).toBe('default');
  });

  test('rejects accessor and symbol keys before invoking a getter', () => {
    let calls = 0;
    const body = { text: 'hello' };
    Object.defineProperty(body, 'sessionId', {
      enumerable: true,
      get() {
        calls += 1;
        throw new Error('getter must not execute');
      },
    });
    expect(parseChatRequestBody(body)).toEqual({
      ok: false,
      error: 'Chat body contains unsupported fields',
    });
    const symbolBody = { text: 'hello', [Symbol('hidden')]: 'untrusted' };
    expect(parseChatRequestBody(symbolBody).ok).toBe(false);
    expect(calls).toBe(0);
  });

  test('rejects accessor and inherited file references', () => {
    let calls = 0;
    const accessorFile = {};
    Object.defineProperty(accessorFile, 'objectName', {
      get() {
        calls += 1;
        return 'uploads/secret.txt';
      },
    });
    const inheritedFile = Object.create({ objectName: 'uploads/inherited.txt' });
    for (const file of [accessorFile, inheritedFile]) {
      expect(parseChatRequestBody({ files: [file] })).toEqual({
        ok: false,
        error: 'Invalid chat file reference',
      });
    }
    expect(calls).toBe(0);
  });

  test('accepts null-prototype JSON-shaped data records', () => {
    const body = Object.assign(Object.create(null), {
      text: ' hello ',
      files: [Object.assign(Object.create(null), { objectName: 'uploads/ok.pdf' })],
    });
    expect(parseChatRequestBody(body)).toEqual({
      ok: true,
      value: {
        sessionId: 'default',
        text: 'hello',
        files: [{ objectName: 'uploads/ok.pdf', mimeType: 'application/octet-stream' }],
      },
    });
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
  test('default route failure path emits one bounded JSON record to stdout', () => {
    const output = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        [
          "import { logRouteFailure } from './src/api/route-safety.js';",
          "const error = new Error('PRIVATE_PROVIDER_DETAIL');",
          "error.code = 'UPSTREAM_DOWN';",
          "const ok = logRouteFailure({ event: 'route.failed', error,",
          "context: { requestId: 'r-1', nested: { secret: 'PRIVATE_CONTEXT' } } });",
          'if (!ok) process.exit(1);',
        ].join('\n'),
      ],
      { cwd: new URL('../../', import.meta.url), encoding: 'utf8' },
    );
    const lines = output.trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toEqual({
      timestamp: expect.any(String),
      level: 'error',
      logger: 'route-safety',
      message: 'Route operation failed',
      schemaVersion: 1,
      event: 'route.failed',
      requestId: 'r-1',
      errorName: 'Error',
      errorCode: 'UPSTREAM_DOWN',
    });
    expect(output).not.toContain('PRIVATE_PROVIDER_DETAIL');
    expect(output).not.toContain('PRIVATE_CONTEXT');
  });

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

describe('pre-execution validation boundary guarantees', () => {
  test('aliases match primary parser functions exactly', () => {
    expect(validateUploadFile).toBe(parseUploadFile);
    expect(validateStorageObjectName).toBe(parseStorageObjectName);
    expect(validateChatRequestBody).toBe(parseChatRequestBody);
  });

  test('rejects malformed upload before cloud/filesystem operations', () => {
    const invalidFile = {
      originalname: '../etc/passwd',
      buffer: 'invalid-type',
      mimetype: 'invalid',
    };
    const result = validateUploadFile(invalidFile);
    expect(result.ok).toBe(false);
  });

  test('rejects path traversal object names before storage lookups', () => {
    const result = validateStorageObjectName('uploads/../../secret.txt');
    expect(result.ok).toBe(false);
  });

  test('rejects invalid chat payload before AI provider invocation', () => {
    const result = validateChatRequestBody({
      sessionId: '123',
      files: [{ objectName: 'invalid-prefix.pdf' }],
    });
    expect(result.ok).toBe(false);
  });
});
