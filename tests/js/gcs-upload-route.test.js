import { afterEach, describe, expect, jest, test } from '@jest/globals';

const SOURCE =
  '../../Software Engineering & AI Tooling/Storage & File Services/GCS Upload Pipeline/06 FINAL CORRECTED CODE/upload_route.mjs';
let importId = 0;

async function loadRoute(bucket) {
  const registered = {};
  const uploadMiddleware = jest.fn();
  const single = jest.fn(() => uploadMiddleware);
  const multer = jest.fn(() => ({ single }));
  multer.memoryStorage = jest.fn(() => ({ kind: 'memory' }));

  globalThis.bucket = bucket;
  globalThis.multer = multer;
  globalThis.app = {
    post: jest.fn((path, middleware, handler) => {
      registered.path = path;
      registered.middleware = middleware;
      registered.handler = handler;
    }),
  };

  await import(`${SOURCE}?test=${importId++}`);

  return { ...registered, multer, single, uploadMiddleware };
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
          originalname: 'project notes.txt',
          buffer,
          mimetype: 'text/plain',
        },
      },
      res,
    );

    expect(file).toHaveBeenCalledWith('uploads/1700000000000-project_notes.txt');
    expect(save).toHaveBeenCalledWith(buffer, {
      metadata: { contentType: 'text/plain' },
      resumable: false,
    });
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      objectName: 'uploads/1700000000000-project_notes.txt',
      mimeType: 'text/plain',
    });
  });

  test('returns a storage error when object persistence fails', async () => {
    const error = new Error('storage unavailable');
    const save = jest.fn().mockRejectedValue(error);
    const { handler } = await loadRoute({ file: jest.fn(() => ({ save })) });
    const res = responseHarness();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

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

    expect(consoleError).toHaveBeenCalledWith('Upload error:', error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'storage unavailable' });
  });
});
