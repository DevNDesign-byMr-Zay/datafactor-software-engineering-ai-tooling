import { describe, expect, test } from '@jest/globals';
import {
  createWorkbenchStaticRoutes,
  serveWorkbenchStaticRoute,
} from '../../src/api/workbench-static-routes.js';
import { createWorkbenchServer as createCompanion } from '../../apps/aetherforge-workbench/server.mjs';
import { createWorkbenchServer as createCommercial } from '../../apps/aetherforge-commercial/server.mjs';

// Golden contract captured from the existing pre-refactor server allowlists.
// Keep every URL, relative file and MIME type unchanged across editions.
const expectedShared = [
  ["/aetherforge-corpus/navigation.css", ["../aetherforge-corpus/navigation.css", "text/css; charset=utf-8"]],
  ["/aetherforge-corpus/index.html", ["../aetherforge-corpus/index.html", "text/html; charset=utf-8"]],
  ["/aetherforge-corpus/catalog.browser.js", ["../aetherforge-corpus/catalog.browser.js", "text/javascript; charset=utf-8"]],
  ["/aetherforge-corpus/catalog-core.js", ["../aetherforge-corpus/catalog-core.js", "text/javascript; charset=utf-8"]],
  ["/aetherforge-corpus/viewer.js", ["../aetherforge-corpus/viewer.js", "text/javascript; charset=utf-8"]],
  ["/aetherforge-corpus/viewer.css", ["../aetherforge-corpus/viewer.css", "text/css; charset=utf-8"]],
  ["/aetherforge-corpus/manifest.json", ["../aetherforge-corpus/manifest.json", "application/json; charset=utf-8"]],
  ["/aetherforge-corpus/software-engineering-ai-tooling.zip", ["../aetherforge-corpus/software-engineering-ai-tooling.zip", "application/zip"]],
  ["/assets/references/app-icon.webp", ["assets/references/app-icon.webp", "image/webp"]],
  ["/assets/references/brand-identity-board.webp", ["assets/references/brand-identity-board.webp", "image/webp"]],
  ["/assets/references/desktop-ui-concept.webp", ["assets/references/desktop-ui-concept.webp", "image/webp"]],
  ["/assets/references/mobile-ui-concept.webp", ["assets/references/mobile-ui-concept.webp", "image/webp"]],
  ["/assets/references/orbit-emblem.webp", ["assets/references/orbit-emblem.webp", "image/webp"]],
  ["/assets/references/primary-logo.webp", ["assets/references/primary-logo.webp", "image/webp"]],
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/app.css", ["app.css", "text/css; charset=utf-8"]],
  ["/app-v2.css", ["app-v2.css", "text/css; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/app-behavior.js", ["app-behavior.js", "text/javascript; charset=utf-8"]],
  ["/workspace-memory.js", ["workspace-memory.js", "text/javascript; charset=utf-8"]],
  ["/command-rail.js", ["command-rail.js", "text/javascript; charset=utf-8"]],
  ["/workflow-studio.js", ["workflow-studio.js", "text/javascript; charset=utf-8"]],
  ["/workflow-studio-export.js", ["workflow-studio-export.js", "text/javascript; charset=utf-8"]],
  ["/evidence-center.js", ["evidence-center.js", "text/javascript; charset=utf-8"]],
  ["/assets/reference-manifest.json", ["assets/reference-manifest.json", "application/json; charset=utf-8"]],
  ["/assets/aetherforge-logo.svg", ["assets/aetherforge-logo.svg", "image/svg+xml"]],
  ["/assets/aetherforge-emblem.svg", ["assets/aetherforge-emblem.svg", "image/svg+xml"]],
  ["/assets/aetherforge-icon.svg", ["assets/aetherforge-icon.svg", "image/svg+xml"]],
];
const expectedEdition = {
  companion: [
    ["/aetherforge-workbench/assets/aetherforge-icon.svg", ["assets/aetherforge-icon.svg", "image/svg+xml"]],
    ["/aetherforge-workbench/assets/aetherforge-emblem.svg", ["assets/aetherforge-emblem.svg", "image/svg+xml"]],
  ],
  commercial: [
    ["/aetherforge-workbench/assets/aetherforge-icon.svg", ["../aetherforge-workbench/assets/aetherforge-icon.svg", "image/svg+xml"]],
    ["/aetherforge-workbench/assets/aetherforge-emblem.svg", ["../aetherforge-workbench/assets/aetherforge-emblem.svg", "image/svg+xml"]],
    ["/upstream-core.js", ["upstream-core.js", "text/javascript; charset=utf-8"]],
    ["/upstream-catalog.js", ["upstream-catalog.js", "text/javascript; charset=utf-8"]],
    ["/ide-core.js", ["ide-core.js", "text/javascript; charset=utf-8"]],
    ["/project-zip-core.js", ["project-zip-core.js", "text/javascript; charset=utf-8"]],
    ["/engineering-ide.js", ["engineering-ide.js", "text/javascript; charset=utf-8"]],
    ["/engineering-ide.css", ["engineering-ide.css", "text/css; charset=utf-8"]],
    ["/operator-profile-core.js", ["operator-profile-core.js", "text/javascript; charset=utf-8"]],
    ["/operator-profile.js", ["operator-profile.js", "text/javascript; charset=utf-8"]],
    ["/operator-profile.css", ["operator-profile.css", "text/css; charset=utf-8"]],
    ["/library.css", ["library.css", "text/css; charset=utf-8"]],
    ["/sandbox.css", ["sandbox.css", "text/css; charset=utf-8"]],
    ["/library-core.js", ["library-core.js", "text/javascript; charset=utf-8"]],
    ["/library.js", ["library.js", "text/javascript; charset=utf-8"]],
    ["/sandbox-core.js", ["sandbox-core.js", "text/javascript; charset=utf-8"]],
    ["/sandbox-frame.html", ["sandbox-frame.html", "text/html; charset=utf-8"]],
    ["/sandbox-frame.js", ["sandbox-frame.js", "text/javascript; charset=utf-8"]],
    ["/sandbox.js", ["sandbox.js", "text/javascript; charset=utf-8"]],
    ["/source-bundle.js", ["source-bundle.js", "text/javascript; charset=utf-8"]],
    ["/project-desk.css", ["project-desk.css", "text/css; charset=utf-8"]],
    ["/project-core.js", ["project-core.js", "text/javascript; charset=utf-8"]],
    ["/project-desk.js", ["project-desk.js", "text/javascript; charset=utf-8"]],
    ["/offline-runtime.js", ["offline-runtime.js", "text/javascript; charset=utf-8"]],
    ["/cloud-backend.js", ["cloud-backend.js", "text/javascript; charset=utf-8"]],
    ["/reference-manifest.browser.js", ["reference-manifest.browser.js", "text/javascript; charset=utf-8"]],
    ["/evidence-center.browser.js", ["evidence-center.browser.js", "text/javascript; charset=utf-8"]],
  ],
};
const editions = [
  ['companion', createCompanion, 31],
  ['commercial', createCommercial, 56],
];

describe('ÆtherForge static asset route parity', () => {
  test.each(editions)('%s keeps the exact prior allowlist and MIME mapping', (edition, _createServer, count) => {
    const actual = createWorkbenchStaticRoutes(edition);
    const expected = new Map([...expectedShared, ...expectedEdition[edition]]);
    expect(actual.size).toBe(count);
    expect(Object.fromEntries(actual)).toEqual(Object.fromEntries(expected));
    expect(actual.has('/assets/../package.json')).toBe(false);
    expect(actual.has('/api/health')).toBe(false);
  });

  test('editions cannot modify each other’s shared route definitions', () => {
    const first = createWorkbenchStaticRoutes('companion');
    first.delete('/app.js');
    first.set('/unapproved-file', ['../../package.json', 'text/plain']);
    expect(createWorkbenchStaticRoutes('commercial').has('/unapproved-file')).toBe(false);
    expect(createWorkbenchStaticRoutes('companion').has('/app.js')).toBe(true);
  });

  test.each(['unknown', '__proto__', 'constructor', '', null])(
    'fails closed for an unknown edition %s',
    (edition) => {
      expect(() => createWorkbenchStaticRoutes(edition)).toThrow(
        'Unsupported ÆtherForge static route edition',
      );
    },
  );

  test('helper serves only exact GET assets and preserves the original raw response', async () => {
    const routes = new Map([['/one', ['package.json', 'application/json; charset=utf-8']]]);
    const calls = [];
    const root = new URL('../..', import.meta.url).pathname;
    const respond = (res, code, bytes, mime) => calls.push({ res, code, bytes, mime });
    const options = { routes, pathname: '/one', root, res: {}, respond };
    expect(await serveWorkbenchStaticRoute({ ...options, method: 'HEAD' })).toBe(false);
    expect(await serveWorkbenchStaticRoute({ ...options, method: 'PUT' })).toBe(false);
    expect(await serveWorkbenchStaticRoute({ ...options, pathname: '/missing', method: 'GET' })).toBe(false);
    expect(calls).toHaveLength(0);
    expect(await serveWorkbenchStaticRoute({ ...options, method: 'GET' })).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].code).toBe(200);
    expect(calls[0].mime).toBe('application/json; charset=utf-8');
    expect(calls[0].bytes.toString()).toContain('software-engineering-ai-tooling-corpus');
  });

  test.each(editions)('%s serves the original asset content types over HTTP', async (edition, factory) => {
    const server = factory();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const origin = `http://127.0.0.1:${server.address().port}`;
      const samples = [
        ['/app.js', 'text/javascript; charset=utf-8'],
        ['/assets/aetherforge-icon.svg', 'image/svg+xml'],
        ['/assets/references/app-icon.webp', 'image/webp'],
      ];
      samples.push(
        edition === 'commercial'
          ? ['/ide-core.js', 'text/javascript; charset=utf-8']
          : ['/aetherforge-workbench/assets/aetherforge-icon.svg', 'image/svg+xml'],
      );
      for (const [url, mime] of samples) {
        const response = await fetch(origin + url);
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe(mime);
        expect(response.headers.get('x-frame-options')).toBe('DENY');
        expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
      }

      const missing = await fetch(origin + '/assets/does-not-exist.png');
      expect(missing.status).toBe(404);
      expect(await missing.json()).toEqual({ error: 'Not found' });
      const head = await fetch(origin + '/app.js', { method: 'HEAD' });
      expect(head.status).toBe(404);
    } finally {
      await new Promise((resolve, reject) =>
        server.close(error => (error ? reject(error) : resolve())),
      );
    }
  });

  test('the commercial sandbox frame retains its isolated frameable CSP exception', async () => {
    const server = createCommercial();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const base = `http://127.0.0.1:${server.address().port}`;
      const frame = await fetch(base + '/sandbox-frame.html');
      expect(frame.status).toBe(200);
      expect(frame.headers.get('x-frame-options')).toBe('SAMEORIGIN');
      expect(frame.headers.get('content-security-policy')).toContain("frame-ancestors 'self'");
      expect(frame.headers.get('content-security-policy')).toContain("connect-src 'none'");
    } finally {
      await new Promise((resolve, reject) =>
        server.close(error => (error ? reject(error) : resolve())),
      );
    }
  });
});
