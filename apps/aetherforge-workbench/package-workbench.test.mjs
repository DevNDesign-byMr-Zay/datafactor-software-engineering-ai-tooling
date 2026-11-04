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

test('refuses to delete unrelated or modified output when rebuilding', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'aetherforge-rebuild-'));
  try {
    const unrelated = join(tempRoot, 'unrelated');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(unrelated);
    await writeFile(join(unrelated, 'important.txt'), 'keep this');
    const { buildWorkbenchPackage } = await import('./package-workbench.mjs');
    await assert.rejects(buildWorkbenchPackage(unrelated), /Refusing to replace nonempty output/);
    assert.equal(await readFile(join(unrelated, 'important.txt'), 'utf8'), 'keep this');
    const output = join(tempRoot, 'bundle');
    await buildWorkbenchPackage(output);
    await buildWorkbenchPackage(output);
    await writeFile(join(output, 'important.txt'), 'new user data');
    await assert.rejects(buildWorkbenchPackage(output), /Refusing to replace nonempty output/);
    assert.equal(await readFile(join(output, 'important.txt'), 'utf8'), 'new user data');
  } finally { await rm(tempRoot, { recursive: true, force: true }); }
});


test('direct-file entry initializes offline navigation without network or module loading', async () => {
  const { Script, runInNewContext } = await import('node:vm');
  const html = await readFile(join(appDir, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script([^>]+)src="\.\/([^"]+)"[^>]*><\/script>/gu)];
  assert.ok(scripts.length >= 6);
  for (const [, attributes, file] of scripts) {
    assert.ok(!attributes.includes('type="module"'), `${file} must initialize from an opaque file origin`);
    new Script(await readFile(join(appDir, file), 'utf8'), { filename: file });
  }
  const nodes = new Map(), listeners = {};
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {
      textContent: '', innerHTML: '', dataset: {},
      classList: { add() {}, toggle() {} },
      setAttribute() {}, removeAttribute() {}
    });
    return nodes.get(selector);
  };
  let requests = 0;
  const context = {
    location: { protocol: 'file:' }, window: { scrollTo() {} },
    document: {
      body: node('body'), querySelector: node, querySelectorAll: () => [],
      addEventListener(type, handler) { (listeners[type] ||= []).push(handler); }
    },
    localStorage: { getItem() { throw new Error('storage denied'); } },
    fetch() { requests++; throw new Error('network forbidden in direct-file boot'); }
  };
  runInNewContext(await readFile(join(appDir, 'app.js'), 'utf8'), context);
  assert.equal(requests, 0);
  assert.equal(node('#connectionBadge').textContent, 'OFFLINE PREVIEW');
  assert.equal(node('#connectionBadge').dataset.ready, 'true');
  assert.match(node('#main').innerHTML, /ENGINEERING CONTROL/);
  for (const page of ['modules', 'studio', 'evidence', 'sustainability', 'assets', 'assistant', 'settings']) {
    listeners.click[0]({ target: { closest: () => ({ dataset: { page } }) } });
    assert.ok(node('#main').innerHTML.length > 100, `${page} should render offline`);
  }
  assert.equal(requests, 0);
});
