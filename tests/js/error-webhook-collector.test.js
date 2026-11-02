import { createServer } from 'node:http';

import { describe, expect, test } from '@jest/globals';

import { createErrorWebhookCapture } from '../../src/observability/error-webhook.js';

async function withCollector(status, callback) {
  const messages = [];
  const server = createServer(async (request, response) => {
    const buffers = [];
    for await (const chunk of request) buffers.push(chunk);
    messages.push({
      method: request.method,
      contentType: request.headers['content-type'],
      body: JSON.parse(Buffer.concat(buffers).toString('utf8')),
    });
    response.writeHead(status);
    response.end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    return await callback('http://127.0.0.1:' + server.address().port, messages);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

const safeEvent = {
  event: 'http.request.unhandled',
  requestId: 'test-correlation-id',
  route: '/api/run',
  method: 'POST',
  statusCode: 500,
};

describe('bounded error reporting through a real isolated HTTP collector', () => {
  test('posts only allowlisted JSON fields', async () =>
    withCollector(202, async (localUrl, messages) => {
      const capture = createErrorWebhookCapture({
        enabled: true,
        url: 'https://collector.example.com/ingest',
        fetchImpl: (destination, options) => {
          expect(destination).toBe('https://collector.example.com/ingest');
          expect(options.redirect).toBe('error');
          expect(options.credentials).toBe('omit');
          return fetch(localUrl, options);
        },
      });
      await expect(
        capture(new Error('raw-private-error'), { ...safeEvent, token: 'SECRET_TOKEN' }),
      ).resolves.toBeUndefined();
      expect(messages).toHaveLength(1);
      expect(messages[0].method).toBe('POST');
      expect(messages[0].contentType).toBe('application/json');
      expect(messages[0].body).toEqual({ schemaVersion: 1, ...safeEvent });
      expect(JSON.stringify(messages)).not.toMatch(/private|SECRET_TOKEN/u);
    }));

  test('fails clearly when collector rejects the event', async () =>
    withCollector(503, async (localUrl, messages) => {
      const capture = createErrorWebhookCapture({
        enabled: true,
        url: 'https://collector.example.com/ingest',
        fetchImpl: (_destination, options) => fetch(localUrl, options),
      });
      await expect(capture(new Error('PRIVATE_MESSAGE'), safeEvent)).rejects.toThrow(
        'Error webhook delivery failed',
      );
      expect(messages).toHaveLength(1);
      expect(JSON.stringify(messages)).not.toContain('PRIVATE_MESSAGE');
    }));
});
