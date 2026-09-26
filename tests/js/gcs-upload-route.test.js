import { afterEach, describe, expect, jest, test } from '@jest/globals';

const SOURCE = '../../src/promoted/gcs-upload-route.mjs';
let importId = 0;

async function loadRoute(bucket) {
  const registered = {};
  const uploadMiddleware = jest.fn();
  const single = jest.fn(() => uploadMiddleware);
  const multer = jest.fn(() => ({ single }));
  multer.memoryStorage = jest.fn(() => ({ kind: 'memory' }));

  globalThis.bucket = bucket;
  globalThis.multer = multer;
  globalThis.routeLogger = { error: jest.fn(), warn: jest.fn() };
  globalThis.app = {
    post: jest.fn((path, middleware, handler) => {
      registered.path = path;
      registered.middleware = middleware;
      registered.handler = handler;
    }),
  };

  await import(`${SOURCE}?test=${importId++}`);

  return {
    ...registered,
    multer,
    single,
    uploadMiddleware,
    routeLogger: globalThis.routeLogger,
  };
}

function responseHarness() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

afterEach(() => {
  delete globalThis.app;
  delete globalThis.bucket;
  delete globalThis.multer;
  delete globalThis.routeLogger;
  jest.restoreAllMocks();
});

describe('GCS upload pipeline final route', () => {
  test('registers a memory-upload middleware on POST /upload', async () => {
    const route = await loadRoute({ file: jest.fn() });

    expect(route.path).toBe('/upload');
    expect(route.multer.memoryStorage).toHaveBeenCalledTimes(1);
    expect(route.multer).toHaveBeenCalledWith({ storage: { kind: 'memory' } });
    expect(route.single).toHaveBeenCalledWith('file');
    expect(route.middleware).toBe(route.uploadMiddleware);
  });

  test('rejects upload requests when the bucket is not configured', async () => {
    const { handler } = await loadRoute(null);
    const res = responseHarness();

    await handler({ file: { originalname: 'file.txt' } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Bucket not configured' });
  });

  test('rejects upload requests without a file', async () => {
    const { handler } = await loadRoute({ file: jest.fn() });
    const res = responseHarness();

    await handler({}, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No file uploaded' });
  });

  test('normalizes the filename, saves bytes, and returns object metadata', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const save = jest.fn().mockResolvedValue(undefined);
    const file = jest.fn(() => ({ save }));
    const { handler } = await loadRoute({ file });
    const res = responseHarness();
    const buffer = Buffer.from('hello');

    await handler(
      {
        file: {
          originalname: '../project notes.txt',
          buffer,
          mimetype: 'text/plain',
        },
      },
      res,
    );

    expect(file).toHaveBeenCalledWith('uploads/1700000000000-_project_notes.txt');
    expect(save).toHaveBeenCalledWith(buffer, {
      metadata: { contentType: 'text/plain' },
      resumable: false,
    });
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      objectName: 'uploads/1700000000000-_project_notes.txt',
      mimeType: 'text/plain',
    });
  });

  test('rejects malformed upload metadata before storage is called', async () => {
    const file = jest.fn();
    const { handler } = await loadRoute({ file });
    const res = responseHarness();

    await handler(
      {
        file: {
          originalname: 'file.txt',
          buffer: Buffer.from('x'),
          mimetype: 'not-a-mime',
        },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid upload MIME type' });
    expect(file).not.toHaveBeenCalled();
  });

  test('sanitizes persistence failures without leaking raw error text', async () => {
    const secret = 'storage-token=do-not-return';
    const error = new Error(secret);
    error.code = 'STORAGE_DOWN';
    const save = jest.fn().mockRejectedValue(error);
    const { handler, routeLogger } = await loadRoute({ file: jest.fn(() => ({ save })) });
    const res = responseHarness();

    await handler(
      {
        file: {
          originalname: 'file.bin',
          buffer: Buffer.from('x'),
          mimetype: 'application/octet-stream',
        },
      },
      res,
    );

    expect(routeLogger.error).toHaveBeenCalledWith(
      {
        schemaVersion: 1,
        event: 'upload.persist_failed',
        errorName: 'Error',
        errorCode: 'STORAGE_DOWN',
      },
      'Upload persistence failed',
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unable to store upload' });
    expect(JSON.stringify(routeLogger.error.mock.calls)).not.toContain(secret);
  });
});
