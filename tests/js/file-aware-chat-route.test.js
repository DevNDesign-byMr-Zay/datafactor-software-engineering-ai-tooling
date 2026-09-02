import { afterEach, describe, expect, jest, test } from '@jest/globals';

const SOURCE =
  '../../Software Engineering & AI Tooling/AI Model Integration/Gemini File Aware Chat Pipeline/06 FINAL CORRECTED CODE/chat_route.mjs';
let importId = 0;

async function loadRoute({ geminiModel = {}, bucket = null, generateReply = jest.fn() } = {}) {
  const registered = {};
  globalThis.geminiModel = geminiModel;
  globalThis.bucket = bucket;
  globalThis.generateReply = generateReply;
  globalThis.app = {
    post: jest.fn((path, handler) => {
      registered.path = path;
      registered.handler = handler;
    }),
  };

  await import(`${SOURCE}?test=${importId++}`);
  return { ...registered, generateReply };
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

  test('uses default session and an empty parts array for an empty body', async () => {
    const generateReply = jest.fn().mockResolvedValue('empty reply');
    const { handler } = await loadRoute({ generateReply });
    const res = responseHarness();

    await handler({ body: {} }, res);

    expect(generateReply).toHaveBeenCalledWith([]);
    expect(res.json).toHaveBeenCalledWith({ reply: 'empty reply', sessionId: 'default' });
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
          sessionId: 'session-1',
          text: 'Summarize these',
          files: [
            { objectName: 'uploads/a.pdf', mimeType: 'application/pdf' },
            { objectName: 'uploads/b.bin' },
            { mimeType: 'image/png' },
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

  test('skips file references when no bucket is available', async () => {
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

    expect(generateReply).toHaveBeenCalledWith([{ text: 'hello' }]);
  });

  test('continues when one file cannot be signed', async () => {
    const error = new Error('sign failed');
    const getSignedUrl = jest.fn().mockRejectedValue(error);
    const bucket = { file: jest.fn(() => ({ getSignedUrl })) };
    const generateReply = jest.fn().mockResolvedValue('fallback reply');
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { handler } = await loadRoute({ bucket, generateReply });
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

    expect(consoleWarn).toHaveBeenCalledWith(
      'Failed to sign file:',
      'uploads/a.pdf',
      'sign failed',
    );
    expect(generateReply).toHaveBeenCalledWith([{ text: 'hello' }]);
    expect(res.json).toHaveBeenCalledWith({ reply: 'fallback reply', sessionId: 'default' });
  });

  test('returns a request error when reply generation fails', async () => {
    const error = new Error('model unavailable');
    const generateReply = jest.fn().mockRejectedValue(error);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { handler } = await loadRoute({ generateReply });
    const res = responseHarness();

    await handler({ body: { text: 'hello' } }, res);

    expect(consoleError).toHaveBeenCalledWith('Chat error:', error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'model unavailable' });
  });
});
