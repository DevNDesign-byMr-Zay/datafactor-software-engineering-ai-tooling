import { describe, expect, jest, test } from '@jest/globals';

import {
  registerFileAwareChatRoute,
  registerGcsUploadRoute,
  registerSignedUrlRoute,
} from '../../src/workflows/cloud-file-workflow.js';

function responseHarness() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

function uploadAppHarness() {
  const registered = {};
  const app = {
    post: jest.fn((path, middleware, handler) => {
      registered.path = path;
      registered.middleware = middleware;
      registered.handler = handler;
    }),
  };
  return { app, registered };
}

function routeAppHarness(method) {
  const registered = {};
  const app = {
    [method]: jest.fn((path, handler) => {
      registered.path = path;
      registered.handler = handler;
    }),
  };
  return { app, registered };
}

describe('canonical GCS upload workflow', () => {
  test('registers memory upload middleware and persists object metadata', async () => {
    const uploadMiddleware = jest.fn();
    const single = jest.fn(() => uploadMiddleware);
    const multer = jest.fn(() => ({ single }));
    multer.memoryStorage = jest.fn(() => ({ kind: 'memory' }));
    const save = jest.fn().mockResolvedValue(undefined);
    const bucket = { file: jest.fn(() => ({ save })) };
    const { app, registered } = uploadAppHarness();

    registerGcsUploadRoute({
      app,
      multer,
      bucket,
      now: () => 1_700_000_000_000,
    });

    expect(registered.path).toBe('/upload');
    expect(multer.memoryStorage).toHaveBeenCalledTimes(1);
    expect(single).toHaveBeenCalledWith('file');
    expect(registered.middleware).toBe(uploadMiddleware);

    const res = responseHarness();
    const buffer = Buffer.from('hello');
    await registered.handler(
      {
        file: {
          originalname: 'project notes.txt',
          buffer,
          mimetype: 'text/plain',
        },
      },
      res,
    );

    expect(bucket.file).toHaveBeenCalledWith('uploads/1700000000000-project notes.txt');
    expect(save).toHaveBeenCalledWith(buffer, {
      metadata: { contentType: 'text/plain' },
      resumable: false,
    });
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      objectName: 'uploads/1700000000000-project notes.txt',
      mimeType: 'text/plain',
    });
  });

  test('preserves historical bucket and file validation', async () => {
    const multer = jest.fn(() => ({ single: () => jest.fn() }));
    multer.memoryStorage = jest.fn(() => ({}));
    const { app, registered } = uploadAppHarness();
    registerGcsUploadRoute({ app, multer, bucket: null });
    const res = responseHarness();

    await registered.handler({ file: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Bucket not configured' });

    const second = uploadAppHarness();
    registerGcsUploadRoute({
      app: second.app,
      multer,
      bucket: { file: jest.fn() },
    });
    const secondRes = responseHarness();
    await second.registered.handler({}, secondRes);
    expect(secondRes.status).toHaveBeenCalledWith(400);
    expect(secondRes.json).toHaveBeenCalledWith({ error: 'No file uploaded' });
  });

  test('surfaces storage failures through the authenticated error contract', async () => {
    const multer = jest.fn(() => ({ single: () => jest.fn() }));
    multer.memoryStorage = jest.fn(() => ({}));
    const error = new Error('storage unavailable');
    const logger = { error: jest.fn() };
    const { app, registered } = uploadAppHarness();
    registerGcsUploadRoute({
      app,
      multer,
      bucket: {
        file: jest.fn(() => ({ save: jest.fn().mockRejectedValue(error) })),
      },
      logger,
    });
    const res = responseHarness();

    await registered.handler(
      {
        file: {
          originalname: 'file.bin',
          buffer: Buffer.from('x'),
          mimetype: 'application/octet-stream',
        },
      },
      res,
    );

    expect(logger.error).toHaveBeenCalledWith('Upload error:', error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'storage unavailable' });
  });
});

describe('canonical signed URL workflow', () => {
  test('creates a one-hour read URL', async () => {
    const getSignedUrl = jest.fn().mockResolvedValue(['https://example.test/signed']);
    const bucket = { file: jest.fn(() => ({ getSignedUrl })) };
    const { app, registered } = routeAppHarness('get');
    registerSignedUrlRoute({
      app,
      bucket,
      now: () => 1_700_000_000_000,
    });
    const res = responseHarness();

    await registered.handler({ query: { object: 'uploads/a.txt' } }, res);

    expect(registered.path).toBe('/sign');
    expect(bucket.file).toHaveBeenCalledWith('uploads/a.txt');
    expect(getSignedUrl).toHaveBeenCalledWith({
      action: 'read',
      expires: 1_700_003_600_000,
    });
    expect(res.json).toHaveBeenCalledWith({
      url: 'https://example.test/signed',
    });
  });

  test('preserves configuration, query, and signing error contracts', async () => {
    const noBucket = routeAppHarness('get');
    registerSignedUrlRoute({ app: noBucket.app, bucket: null });
    const firstRes = responseHarness();
    await noBucket.registered.handler({ query: { object: 'x' } }, firstRes);
    expect(firstRes.status).toHaveBeenCalledWith(500);

    const noObject = routeAppHarness('get');
    registerSignedUrlRoute({
      app: noObject.app,
      bucket: { file: jest.fn() },
    });
    const secondRes = responseHarness();
    await noObject.registered.handler({ query: {} }, secondRes);
    expect(secondRes.status).toHaveBeenCalledWith(400);
    expect(secondRes.json).toHaveBeenCalledWith({ error: 'Missing ?object=' });

    const error = new Error('signing failed');
    const logger = { error: jest.fn() };
    const failed = routeAppHarness('get');
    registerSignedUrlRoute({
      app: failed.app,
      bucket: {
        file: jest.fn(() => ({
          getSignedUrl: jest.fn().mockRejectedValue(error),
        })),
      },
      logger,
    });
    const thirdRes = responseHarness();
    await failed.registered.handler({ query: { object: 'x' } }, thirdRes);
    expect(logger.error).toHaveBeenCalledWith('Sign error:', error);
    expect(thirdRes.status).toHaveBeenCalledWith(500);
  });
});

describe('canonical file-aware chat workflow', () => {
  test('signs file references for 45 minutes and combines them with text', async () => {
    const getSignedUrl = jest.fn().mockResolvedValue(['https://example.test/a']);
    const bucket = { file: jest.fn(() => ({ getSignedUrl })) };
    const generateReply = jest.fn().mockResolvedValue('combined reply');
    const { app, registered } = routeAppHarness('post');
    registerFileAwareChatRoute({
      app,
      geminiModel: {},
      bucket,
      generateReply,
      now: () => 1_700_000_000_000,
    });
    const res = responseHarness();

    await registered.handler(
      {
        body: {
          sessionId: 'session-1',
          text: 'Summarize this',
          files: [{ objectName: 'uploads/a.pdf', mimeType: 'application/pdf' }],
        },
      },
      res,
    );

    expect(registered.path).toBe('/chat');
    expect(getSignedUrl).toHaveBeenCalledWith({
      action: 'read',
      expires: 1_700_002_700_000,
    });
    expect(generateReply).toHaveBeenCalledWith([
      {
        fileData: {
          fileUri: 'https://example.test/a',
          mimeType: 'application/pdf',
        },
      },
      { text: 'Summarize this' },
    ]);
    expect(res.json).toHaveBeenCalledWith({
      reply: 'combined reply',
      sessionId: 'session-1',
    });
  });

  test('uses the historical default session and text-only fallback', async () => {
    const generateReply = jest.fn().mockResolvedValue('text only');
    const { app, registered } = routeAppHarness('post');
    registerFileAwareChatRoute({
      app,
      geminiModel: {},
      bucket: null,
      generateReply,
    });
    const res = responseHarness();

    await registered.handler(
      {
        body: {
          text: 'hello',
          files: [{ objectName: 'uploads/a.pdf' }],
        },
      },
      res,
    );

    expect(generateReply).toHaveBeenCalledWith([{ text: 'hello' }]);
    expect(res.json).toHaveBeenCalledWith({
      reply: 'text only',
      sessionId: 'default',
    });
  });

  test('continues after a file-signing failure', async () => {
    const signingError = new Error('sign failed');
    const logger = { warn: jest.fn(), error: jest.fn() };
    const generateReply = jest.fn().mockResolvedValue('fallback reply');
    const { app, registered } = routeAppHarness('post');
    registerFileAwareChatRoute({
      app,
      geminiModel: {},
      bucket: {
        file: jest.fn(() => ({
          getSignedUrl: jest.fn().mockRejectedValue(signingError),
        })),
      },
      generateReply,
      logger,
    });
    const res = responseHarness();

    await registered.handler(
      {
        body: {
          text: 'hello',
          files: [{ objectName: 'uploads/a.pdf' }],
        },
      },
      res,
    );

    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to sign file:',
      'uploads/a.pdf',
      'sign failed',
    );
    expect(generateReply).toHaveBeenCalledWith([{ text: 'hello' }]);
  });

  test('preserves model-configuration and generation failure contracts', async () => {
    const missingModel = routeAppHarness('post');
    registerFileAwareChatRoute({
      app: missingModel.app,
      geminiModel: null,
      bucket: null,
      generateReply: jest.fn(),
    });
    const firstRes = responseHarness();
    await missingModel.registered.handler({ body: {} }, firstRes);
    expect(firstRes.status).toHaveBeenCalledWith(500);
    expect(firstRes.json).toHaveBeenCalledWith({
      error: 'GEMINI_API_KEY not configured',
    });

    const error = new Error('model unavailable');
    const logger = { warn: jest.fn(), error: jest.fn() };
    const failed = routeAppHarness('post');
    registerFileAwareChatRoute({
      app: failed.app,
      geminiModel: {},
      bucket: null,
      generateReply: jest.fn().mockRejectedValue(error),
      logger,
    });
    const secondRes = responseHarness();
    await failed.registered.handler({ body: { text: 'hello' } }, secondRes);
    expect(logger.error).toHaveBeenCalledWith('Chat error:', error);
    expect(secondRes.status).toHaveBeenCalledWith(500);
    expect(secondRes.json).toHaveBeenCalledWith({ error: 'model unavailable' });
  });
});
