import { afterEach, describe, expect, jest, test } from '@jest/globals';

const SOURCE = '../../src/promoted/file-aware-chat-route.mjs';
let importId = 0;

async function loadRoute({ geminiModel = {}, bucket = null, generateReply = jest.fn() } = {}) {
  const registered = {};
  globalThis.geminiModel = geminiModel;
  globalThis.bucket = bucket;
  globalThis.generateReply = generateReply;
  globalThis.routeLogger = { error: jest.fn(), warn: jest.fn() };
  globalThis.app = {
    post: jest.fn((path, handler) => {
      registered.path = path;
      registered.handler = handler;
    }),
  };

  await import(`${SOURCE}?test=${importId++}`);
  return { ...registered, generateReply, routeLogger: globalThis.routeLogger };
}

function responseHarness() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

afterEach(() => {
  delete globalThis.app;
  delete globalThis.geminiModel;
  delete globalThis.bucket;
  delete globalThis.generateReply;
  delete globalThis.routeLogger;
  jest.restoreAllMocks();
});

describe('file-aware Gemini chat final route', () => {
  test('registers POST /chat', async () => {
    const route = await loadRoute();
    expect(route.path).toBe('/chat');
    expect(route.handler).toEqual(expect.any(Function));
  });

  test('fails when the Gemini model is not configured', async () => {
    const { handler } = await loadRoute({ geminiModel: null });
    const res = responseHarness();

    await handler({ body: { text: 'hello' } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'GEMINI_API_KEY not configured' });
  });

  test('rejects an empty chat request instead of generating an empty prompt', async () => {
    const generateReply = jest.fn().mockResolvedValue('should not run');
    const { handler } = await loadRoute({ generateReply });
    const res = responseHarness();

    await handler({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Chat requires text or a file' });
    expect(generateReply).not.toHaveBeenCalled();
  });

  test('rejects malformed file references before provider work begins', async () => {
    const generateReply = jest.fn();
    const { handler } = await loadRoute({ bucket: { file: jest.fn() }, generateReply });
    const res = responseHarness();

    await handler(
      {
        body: {
          text: 'hello',
          files: [{ objectName: '../private/a.pdf', mimeType: 'application/pdf' }],
        },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid chat file reference' });
    expect(generateReply).not.toHaveBeenCalled();
  });

  test('signs valid file references and combines them with text', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const signed = new Map([
      ['uploads/a.pdf', 'https://example.test/a'],
      ['uploads/b.bin', 'https://example.test/b'],
    ]);
    const getSignedUrl = jest.fn(function getSignedUrl() {
      return Promise.resolve([signed.get(this.objectName)]);
    });
    const file = jest.fn((objectName) => ({ objectName, getSignedUrl }));
    const generateReply = jest.fn().mockResolvedValue('combined reply');
    const { handler } = await loadRoute({ bucket: { file }, generateReply });
    const res = responseHarness();

    await handler(
      {
        body: {
          sessionId: ' session-1 ',
          text: ' Summarize these ',
          files: [
            { objectName: 'uploads/a.pdf', mimeType: 'application/pdf' },
            { objectName: 'uploads/b.bin' },
          ],
        },
      },
      res,
    );

    expect(file).toHaveBeenCalledTimes(2);
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
      {
        fileData: {
          fileUri: 'https://example.test/b',
          mimeType: 'application/octet-stream',
        },
      },
      { text: 'Summarize these' },
    ]);
    expect(res.json).toHaveBeenCalledWith({
      reply: 'combined reply',
      sessionId: 'session-1',
    });
  });

  test('rejects file-aware requests when storage is unavailable', async () => {
    const generateReply = jest.fn().mockResolvedValue('text only');
    const { handler } = await loadRoute({ bucket: null, generateReply });
    const res = responseHarness();

    await handler(
      {
        body: {
          text: 'hello',
          files: [{ objectName: 'uploads/a.pdf', mimeType: 'application/pdf' }],
        },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Bucket not configured for file-aware chat' });
    expect(generateReply).not.toHaveBeenCalled();
  });

  test('continues with text when one file cannot be signed without logging raw details', async () => {
    const secret = 'signed-url-secret=do-not-log';
    const error = new Error(secret);
    error.code = 'SIGNING_DOWN';
    const getSignedUrl = jest.fn().mockRejectedValue(error);
    const bucket = { file: jest.fn(() => ({ getSignedUrl })) };
    const generateReply = jest.fn().mockResolvedValue('fallback reply');
    const { handler, routeLogger } = await loadRoute({ bucket, generateReply });
    const res = responseHarness();

    await handler(
      {
        body: {
          text: 'hello',
          files: [{ objectName: 'uploads/a.pdf', mimeType: 'application/pdf' }],
        },
      },
      res,
    );

    expect(routeLogger.warn).toHaveBeenCalledWith(
      {
        schemaVersion: 1,
        event: 'chat.file_sign_failed',
        objectName: 'uploads/a.pdf',
        errorName: 'Error',
        errorCode: 'SIGNING_DOWN',
      },
      'Chat file signing failed',
    );
    expect(generateReply).toHaveBeenCalledWith([{ text: 'hello' }]);
    expect(res.json).toHaveBeenCalledWith({ reply: 'fallback reply', sessionId: 'default' });
    expect(JSON.stringify(routeLogger.warn.mock.calls)).not.toContain(secret);
  });

  test('fails cleanly when every file is inaccessible and no text remains', async () => {
    const getSignedUrl = jest.fn().mockRejectedValue(new Error('sign failed'));
    const bucket = { file: jest.fn(() => ({ getSignedUrl })) };
    const generateReply = jest.fn();
    const { handler } = await loadRoute({ bucket, generateReply });
    const res = responseHarness();

    await handler(
      {
        body: {
          files: [{ objectName: 'uploads/a.pdf', mimeType: 'application/pdf' }],
        },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unable to access chat files' });
    expect(generateReply).not.toHaveBeenCalled();
  });

  test('sanitizes reply-generation failures without returning provider details', async () => {
    const secret = 'model-key=do-not-return';
    const error = new Error(secret);
    error.code = 'MODEL_DOWN';
    const generateReply = jest.fn().mockRejectedValue(error);
    const { handler, routeLogger } = await loadRoute({ generateReply });
    const res = responseHarness();

    await handler({ body: { text: 'hello' } }, res);

    expect(routeLogger.error).toHaveBeenCalledWith(
      {
        schemaVersion: 1,
        event: 'chat.failed',
        errorName: 'Error',
        errorCode: 'MODEL_DOWN',
      },
      'Chat request failed',
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unable to generate reply' });
    expect(JSON.stringify(routeLogger.error.mock.calls)).not.toContain(secret);
  });
});
