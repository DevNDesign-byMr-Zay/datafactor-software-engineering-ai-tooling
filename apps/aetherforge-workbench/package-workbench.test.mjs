import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appDir, '../..');

test('packages a root HTML entry point with the complete runnable workbench', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'aetherforge-package-'));
  const bundleDir = join(tempRoot, 'bundle');
  const previewPath = join(tempRoot, 'desktop.png');
  const previewBytes = Buffer.from('browser-preview');
  try {
    await writeFile(previewPath, previewBytes);
    const result = spawnSync(process.execPath, [
      join(appDir, 'package-workbench.mjs'), '--output', bundleDir, '--preview', previewPath
    ], { cwd: repoRoot, encoding: 'utf8' });

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const rootEntries = await readdir(bundleDir);
    assert.ok(rootEntries.includes('index.html'), 'bundle root should expose index.html');
    assert.ok(rootEntries.includes('START-HERE.md'));
    assert.ok(rootEntries.includes('package.json'));
    assert.ok(rootEntries.includes('src'));

    const rootHtml = await readFile(join(bundleDir, 'index.html'), 'utf8');
    assert.match(rootHtml, /apps\/aetherforge-workbench\/index\.html/);
    assert.match(rootHtml, /launch-aetherforge\.cmd/);
    assert.match(rootHtml, /src="\.\/preview\.png"/);
    assert.deepEqual(await readFile(join(bundleDir, 'preview.png')), previewBytes);

    const packagedApp = join(bundleDir, 'apps', 'aetherforge-workbench');
    for (const file of [
      'index.html', 'app.css', 'app-v2.css', 'app.js', 'server.mjs',
      'asset-store.mjs', 'launch-aetherforge.cmd', 'assets/aetherforge-logo.svg',
      'assets/references/desktop-ui-concept.webp'
    ]) {
      await readFile(join(packagedApp, file));
    }
    await readFile(join(bundleDir, 'src', 'index.js'));

    const manifest = JSON.parse(await readFile(join(bundleDir, 'package.json'), 'utf8'));
    assert.equal(manifest.type, 'module');
    assert.equal(manifest.engines.node, '>=22');
    assert.equal(rootEntries.includes('node_modules'), false);
    const appEntries = await readdir(packagedApp);
    assert.equal(appEntries.includes('browser-qa.mjs'), false);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
