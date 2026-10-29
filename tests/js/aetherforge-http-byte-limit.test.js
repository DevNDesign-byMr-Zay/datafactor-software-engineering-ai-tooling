import { request } from 'node:http';
import { createWorkbenchServer as commercial } from '../../apps/aetherforge-commercial/server.mjs';
import { createWorkbenchServer as companion } from '../../apps/aetherforge-workbench/server.mjs';

describe.each([
  ['commercial', commercial],
  ['companion', companion],
])('%s workflow request boundary', (_, factory) => {
  test('rejects UTF-8 bodies over 64 KiB even when their character count is smaller', async () => {
    const server = factory();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const payload = JSON.stringify({
        action: 'unsupported',
        inputs: { value: '界'.repeat(24000) },
      });
      expect(payload.length).toBeLessThan(64 * 1024);
      expect(new TextEncoder().encode(payload).length).toBeGreaterThan(64 * 1024);
      const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload,
      });
      expect(response.status).toBe(413);
      expect(await response.json()).toEqual({ error: 'Request exceeds limit' });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

function postWorkflow(url, body, headers) {
  return new Promise((resolve, reject) => {
    const req = request(url, { method: 'POST', headers }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (raw += chunk));
      res.on('error', reject);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.end(body);
  });
}

const validWorkflow = JSON.stringify({
  action: 'brush',
  inputs: { brushSize: 20, shape: 'circle', feather: 0, distance: 10 },
});

describe.each([
  ['commercial', commercial],
  ['companion', companion],
])('%s HTTP validation matrix', (_, factory) => {
  test.each([
    ['accepts exactly 64 KiB', validWorkflow.padEnd(64 * 1024, ' '), {}, 200],
    ['rejects one byte above 64 KiB', validWorkflow.padEnd(64 * 1024 + 1, ' '), {}, 413],
    ['rejects malformed JSON', '{', {}, 422],
    ['rejects arrays', '[]', {}, 422],
    ['rejects null', 'null', {}, 422],
    ['rejects unsupported actions', '{"action":"unsupported","inputs":{}}', {}, 422],
    ['requires JSON content type', validWorkflow, { 'content-type': 'text/plain' }, 415],
    ['accepts its own browser origin', validWorkflow, { origin: 'self' }, 200],
    ['rejects foreign hosts', validWorkflow, { host: 'example.invalid' }, 403],
    ['rejects foreign origins', validWorkflow, { origin: 'https://example.invalid' }, 403],
    ['rejects cross-site requests', validWorkflow, { 'sec-fetch-site': 'cross-site' }, 403],
  ])('%s', async (_label, body, headers, expectedStatus) => {
    const server = factory();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const origin = 'http://127.0.0.1:' + server.address().port;
      const requestHeaders = { 'content-type': 'application/json', ...headers };
      if (requestHeaders.origin === 'self') requestHeaders.origin = origin;
      const response = await postWorkflow(origin + '/api/run', body, requestHeaders);
      const result = response.body;
      expect(response.status).toBe(expectedStatus);
      if (expectedStatus === 200) {
        expect(result.status).toBe('computed');
      } else {
        expect(result.error).toEqual(expect.any(String));
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
