import { describe, expect, test } from '@jest/globals';

import { createWorkbenchResponder } from '../../src/api/workbench-http-response.js';
import { createWorkbenchServer as createCompanion } from '../../apps/aetherforge-workbench/server.mjs';
import { createWorkbenchServer as createCommercial } from '../../apps/aetherforge-commercial/server.mjs';

const basePolicy =
  "default-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'";

const adapters = [
  ['companion', createCompanion, basePolicy],
  [
    'commercial',
    createCommercial,
    basePolicy + ' https://api.github.com https://raw.githubusercontent.com',
  ],
];

function responseRecorder() {
  let status;
  let headers;
  let payload;
  return {
    response: {
      writeHead(code, values) {
        status = code;
        headers = values;
      },
      end(value) {
        payload = value;
      },
    },
    result() {
      return { status, headers, payload };
    },
  };
}

describe('shared ÆtherForge HTTP response contract', () => {
  test.each(adapters)('%s maintains its exact default security headers', (adapter, _server, csp) => {
    const capture = responseRecorder();
    createWorkbenchResponder(adapter)(capture.response, 200, { ok: true });
    expect(capture.result()).toEqual({
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': csp,
        'X-Frame-Options': 'DENY',
      },
      payload: '{"ok":true}',
    });
  });

  test('preserves text and raw Buffer payloads without coercion or JSON wrapping', () => {
    const send = createWorkbenchResponder('companion');
    const text = responseRecorder();
    send(text.response, 404, 'Not found', 'text/plain; charset=utf-8');
    expect(text.result()).toMatchObject({
      status: 404,
      payload: 'Not found',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

    const buffer = Buffer.from([0, 1, 255]);
    const binary = responseRecorder();
    send(binary.response, 201, buffer, 'image/png');
    expect(binary.result().payload).toBe(buffer);
    expect(binary.result()).toMatchObject({
      status: 201,
      headers: { 'Content-Type': 'image/png' },
    });
  });

  test.each(['unknown', 'toString', '__proto__', '', null])(
    'fails closed for unsupported adapter policy %s',
    (policy) => {
      expect(() => createWorkbenchResponder(policy)).toThrow(
        'Unsupported ÆtherForge response policy',
      );
    },
  );

  test.each(adapters)(
    '%s serves existing API, static assets and errors with unchanged security policy',
    async (_adapter, createServer, csp) => {
      const server = createServer();
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const origin = `http://127.0.0.1:${server.address().port}`;
      try {
        for (const path of ['/api/health', '/api/modules', '/not-found']) {
          const response = await fetch(origin + path);
          expect(response.headers.get('content-security-policy')).toBe(csp);
          expect(response.headers.get('x-frame-options')).toBe('DENY');
          expect(response.headers.get('cache-control')).toBe('no-store');
          expect(response.headers.get('referrer-policy')).toBe('no-referrer');
          expect(response.headers.get('x-content-type-options')).toBe('nosniff');
          expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
          if (path === '/not-found') {
            expect(response.status).toBe(404);
            expect(await response.json()).toEqual({ error: 'Not found' });
          } else {
            expect(response.status).toBe(200);
            await response.json();
          }
        }

        const svg = await fetch(origin + '/assets/aetherforge-icon.svg');
        expect(svg.status).toBe(200);
        expect(svg.headers.get('content-type')).toBe('image/svg+xml');
        expect(svg.headers.get('content-security-policy')).toBe(csp);
      } finally {
        await new Promise((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    },
  );

  test('the commercial sandbox remains the only intentionally frameable route', async () => {
    const server = createCommercial();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const base = `http://127.0.0.1:${server.address().port}`;
      const frame = await fetch(base + '/sandbox-frame.html');
      expect(frame.status).toBe(200);
      expect(frame.headers.get('x-frame-options')).toBe('SAMEORIGIN');
      expect(frame.headers.get('content-security-policy')).toContain("frame-ancestors 'self'");
      expect(frame.headers.get('content-security-policy')).toContain("connect-src 'none'");
      const app = await fetch(base + '/');
      expect(app.headers.get('x-frame-options')).toBe('DENY');
      expect(app.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    } finally {
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
