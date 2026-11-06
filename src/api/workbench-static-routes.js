import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * The stable, explicitly allowlisted static route contract shared by
 * ÆtherForge's Companion and Commercial adapters. The relative file paths
 * are resolved from each edition's application directory.
 */
const commonRoutes = [
  [
    '/aetherforge-corpus/navigation.css',
    ['../aetherforge-corpus/navigation.css', 'text/css; charset=utf-8'],
  ],
  [
    '/aetherforge-corpus/index.html',
    ['../aetherforge-corpus/index.html', 'text/html; charset=utf-8'],
  ],
  [
    '/aetherforge-corpus/catalog.browser.js',
    ['../aetherforge-corpus/catalog.browser.js', 'text/javascript; charset=utf-8'],
  ],
  [
    '/aetherforge-corpus/catalog-core.js',
    ['../aetherforge-corpus/catalog-core.js', 'text/javascript; charset=utf-8'],
  ],
  [
    '/aetherforge-corpus/viewer.js',
    ['../aetherforge-corpus/viewer.js', 'text/javascript; charset=utf-8'],
  ],
  [
    '/aetherforge-corpus/viewer.css',
    ['../aetherforge-corpus/viewer.css', 'text/css; charset=utf-8'],
  ],
  [
    '/aetherforge-corpus/manifest.json',
    ['../aetherforge-corpus/manifest.json', 'application/json; charset=utf-8'],
  ],
  [
    '/aetherforge-corpus/software-engineering-ai-tooling.zip',
    ['../aetherforge-corpus/software-engineering-ai-tooling.zip', 'application/zip'],
  ],
  ['/assets/references/app-icon.webp', ['assets/references/app-icon.webp', 'image/webp']],
  [
    '/assets/references/brand-identity-board.webp',
    ['assets/references/brand-identity-board.webp', 'image/webp'],
  ],
  [
    '/assets/references/desktop-ui-concept.webp',
    ['assets/references/desktop-ui-concept.webp', 'image/webp'],
  ],
  [
    '/assets/references/mobile-ui-concept.webp',
    ['assets/references/mobile-ui-concept.webp', 'image/webp'],
  ],
  ['/assets/references/orbit-emblem.webp', ['assets/references/orbit-emblem.webp', 'image/webp']],
  ['/assets/references/primary-logo.webp', ['assets/references/primary-logo.webp', 'image/webp']],
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.css', ['app.css', 'text/css; charset=utf-8']],
  ['/app-v2.css', ['app-v2.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/app-behavior.js', ['app-behavior.js', 'text/javascript; charset=utf-8']],
  ['/workspace-memory.js', ['workspace-memory.js', 'text/javascript; charset=utf-8']],
  ['/command-rail.js', ['command-rail.js', 'text/javascript; charset=utf-8']],
  ['/workflow-studio.js', ['workflow-studio.js', 'text/javascript; charset=utf-8']],
  ['/workflow-studio-export.js', ['workflow-studio-export.js', 'text/javascript; charset=utf-8']],
  ['/evidence-center.js', ['evidence-center.js', 'text/javascript; charset=utf-8']],
  [
    '/assets/reference-manifest.json',
    ['assets/reference-manifest.json', 'application/json; charset=utf-8'],
  ],
  ['/assets/aetherforge-logo.svg', ['assets/aetherforge-logo.svg', 'image/svg+xml']],
  ['/assets/aetherforge-emblem.svg', ['assets/aetherforge-emblem.svg', 'image/svg+xml']],
  ['/assets/aetherforge-icon.svg', ['assets/aetherforge-icon.svg', 'image/svg+xml']],
];

const editionRoutes = {
  companion: [
    [
      '/aetherforge-workbench/assets/aetherforge-icon.svg',
      ['assets/aetherforge-icon.svg', 'image/svg+xml'],
    ],
    [
      '/aetherforge-workbench/assets/aetherforge-emblem.svg',
      ['assets/aetherforge-emblem.svg', 'image/svg+xml'],
    ],
  ],
  commercial: [
    [
      '/aetherforge-workbench/assets/aetherforge-icon.svg',
      ['../aetherforge-workbench/assets/aetherforge-icon.svg', 'image/svg+xml'],
    ],
    [
      '/aetherforge-workbench/assets/aetherforge-emblem.svg',
      ['../aetherforge-workbench/assets/aetherforge-emblem.svg', 'image/svg+xml'],
    ],
    ['/upstream-core.js', ['upstream-core.js', 'text/javascript; charset=utf-8']],
    ['/upstream-catalog.js', ['upstream-catalog.js', 'text/javascript; charset=utf-8']],
    ['/ide-core.js', ['ide-core.js', 'text/javascript; charset=utf-8']],
    ['/project-zip-core.js', ['project-zip-core.js', 'text/javascript; charset=utf-8']],
    ['/engineering-ide.js', ['engineering-ide.js', 'text/javascript; charset=utf-8']],
    ['/engineering-ide.css', ['engineering-ide.css', 'text/css; charset=utf-8']],
    ['/operator-profile-core.js', ['operator-profile-core.js', 'text/javascript; charset=utf-8']],
    ['/operator-profile.js', ['operator-profile.js', 'text/javascript; charset=utf-8']],
    ['/operator-profile.css', ['operator-profile.css', 'text/css; charset=utf-8']],
    ['/library.css', ['library.css', 'text/css; charset=utf-8']],
    ['/sandbox.css', ['sandbox.css', 'text/css; charset=utf-8']],
    ['/library-core.js', ['library-core.js', 'text/javascript; charset=utf-8']],
    ['/library.js', ['library.js', 'text/javascript; charset=utf-8']],
    ['/sandbox-core.js', ['sandbox-core.js', 'text/javascript; charset=utf-8']],
    ['/sandbox-frame.html', ['sandbox-frame.html', 'text/html; charset=utf-8']],
    ['/sandbox-frame.js', ['sandbox-frame.js', 'text/javascript; charset=utf-8']],
    ['/sandbox.js', ['sandbox.js', 'text/javascript; charset=utf-8']],
    ['/source-bundle.js', ['source-bundle.js', 'text/javascript; charset=utf-8']],
    ['/project-desk.css', ['project-desk.css', 'text/css; charset=utf-8']],
    ['/project-core.js', ['project-core.js', 'text/javascript; charset=utf-8']],
    ['/project-desk.js', ['project-desk.js', 'text/javascript; charset=utf-8']],
    ['/offline-runtime.js', ['offline-runtime.js', 'text/javascript; charset=utf-8']],
    ['/cloud-backend.js', ['cloud-backend.js', 'text/javascript; charset=utf-8']],
    [
      '/reference-manifest.browser.js',
      ['reference-manifest.browser.js', 'text/javascript; charset=utf-8'],
    ],
    [
      '/evidence-center.browser.js',
      ['evidence-center.browser.js', 'text/javascript; charset=utf-8'],
    ],
  ],
};

/**
 * Return a fresh map, so callers cannot mutate the shared allowlist.
 * @param {'companion' | 'commercial'} edition
 */
export function createWorkbenchStaticRoutes(edition) {
  if (!Object.hasOwn(editionRoutes, edition)) {
    throw new TypeError('Unsupported ÆtherForge static route edition');
  }
  return new Map([...commonRoutes, ...editionRoutes[edition]]);
}

/**
 * Serve only explicitly mapped GET assets. Missing files are deliberately
 * allowed to throw, preserving the surrounding server's sanitized 500 path.
 * Commercial's separately sandboxed HTML frame is handled before this call.
 */
export async function serveWorkbenchStaticRoute({ routes, pathname, method, root, res, respond }) {
  const asset = routes.get(pathname);
  if (method !== 'GET' || !asset) return false;
  const bytes = await readFile(join(root, asset[0]));
  respond(res, 200, bytes, asset[1]);
  return true;
}
