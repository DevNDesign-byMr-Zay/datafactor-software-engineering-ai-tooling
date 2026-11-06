import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  assertOutsideRepository,
  copyDistributionSource,
  distributionFiles,
  verifyDistribution,
  writeDistributionArchive,
  writeDistributionManifest,
} from './distribution-files.mjs';
import { buildCommercialPackage } from './package-aetherforge-commercial.mjs';
import { buildWorkbenchPackage } from '../apps/aetherforge-workbench/package-workbench.mjs';

const scratch = async (fn) => {
  const root = await mkdtemp(join(tmpdir(), 'aetherforge-integrity-'));
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

test('manifest verifier detects changed, unexpected and missing payload files', async () =>
  scratch(async (root) => {
    await writeFile(join(root, 'index.html'), 'original');
    const manifest = await writeDistributionManifest(root, { application: 'integrity fixture' });
    assert.equal(manifest.fileCount, 1);
    assert.deepEqual(await verifyDistribution(root), manifest);
    await writeFile(join(root, 'index.html'), 'modified');
    await assert.rejects(verifyDistribution(root), /integrity verification failed/);
    await writeFile(join(root, 'index.html'), 'original');
    await writeFile(join(root, 'unexpected.txt'), 'user data');
    await assert.rejects(verifyDistribution(root), /integrity verification failed/);
    await rm(join(root, 'unexpected.txt'));
    await rm(join(root, 'index.html'));
    await assert.rejects(verifyDistribution(root), /integrity verification failed/);
  }));

test('copy excludes real local stores, environment files and host state at every level', async () =>
  scratch(async (root) => {
    const source = join(root, 'source'),
      output = join(root, 'output');
    for (const path of [
      'app.js',
      'assets/public.svg',
      '.local-assets/image.png',
      '.local-workspaces/project.json',
      '.aetherforge/project.json',
      'node_modules/dependency.js',
      'upstream-mirror/source.js',
      'logs/server.txt',
      '.env',
      '.env.production',
      'nested/credentials.json',
      'nested/private.key',
      'nested/.local-data/secret.json',
    ]) {
      await mkdir(join(source, path, '..'), { recursive: true });
      await writeFile(join(source, path), path);
    }
    await copyDistributionSource(source, output);
    assert.deepEqual(
      (await distributionFiles(output)).map((file) => file.path),
      ['app.js', 'assets/public.svg'],
    );
  }));

test(
  'copy refuses source symlinks instead of packaging external bytes',
  { skip: process.platform === 'win32' },
  async () =>
    scratch(async (root) => {
      const source = join(root, 'source');
      await mkdir(source);
      await writeFile(join(root, 'private.txt'), 'not source');
      await symlink(join(root, 'private.txt'), join(source, 'public.js'));
      await assert.rejects(copyDistributionSource(source, join(root, 'output')), /Symbolic links/);
    }),
);

function independentlyExtract(archive, destination) {
  const code =
    'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; z.extractall(sys.argv[2])';
  let result = spawnSync('python3', ['-c', code, archive, destination], { encoding: 'utf8' });
  if (result.error?.code === 'ENOENT')
    result = spawnSync('python', ['-c', code, archive, destination], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
}

test('ZIP is deterministic, independently readable, UTF-8 safe and checksum covered', async () =>
  scratch(async (root) => {
    const directory = join(root, 'bundle');
    await mkdir(directory);
    await writeFile(join(directory, 'ÆtherForge.txt'), 'Unicode ✓');
    await writeFile(join(directory, 'empty.txt'), '');
    await writeDistributionManifest(directory, { application: 'archive fixture' });
    const first = await writeDistributionArchive(directory, join(root, 'first.zip'));
    const second = await writeDistributionArchive(directory, join(root, 'second.zip'));
    assert.equal(first.sha256, second.sha256);
    assert.equal(first.sha256, hash(await readFile(first.path)));
    assert.equal(await readFile(`${first.path}.sha256`, 'utf8'), `${first.sha256}  first.zip\n`);
    const extracted = join(root, 'clean');
    independentlyExtract(first.path, extracted);
    assert.equal(await readFile(join(extracted, 'ÆtherForge.txt'), 'utf8'), 'Unicode ✓');
    await verifyDistribution(extracted);
    await assert.rejects(
      writeDistributionArchive(directory, join(directory, 'nested.zip')),
      /outside distribution/,
    );
  }));

for (const [name, build, app] of [
  ['Commercial', buildCommercialPackage, 'aetherforge-commercial'],
  ['Companion', buildWorkbenchPackage, 'aetherforge-workbench'],
]) {
  test(`${name} clean ZIP extraction verifies and runs the actual packaged local adapter`, async () =>
    scratch(async (root) => {
      const staged = join(root, 'staged');
      await build(staged);
      const archive = await writeDistributionArchive(staged);
      const clean = join(root, 'clean-extraction');
      independentlyExtract(archive.path, clean);
      const check = spawnSync(process.execPath, [join(clean, 'verify-distribution.mjs')], {
        cwd: clean,
        encoding: 'utf8',
      });
      assert.equal(check.status, 0, check.stderr || check.stdout);
      const manifest = await verifyDistribution(clean);
      assert.ok(manifest.files.some((file) => file.path === 'index.html'));

      // Inspect the *extracted* static catalog, not the checkout's catalog.
      // Every mapped route must target an inventoried, SHA-256-verified file
      // inside this archive. This catches incomplete offline packages even
      // when their entry point and a few HTML-linked scripts still work.
      const { createWorkbenchStaticRoutes } = await import(
        pathToFileURL(join(clean, 'src', 'api', 'workbench-static-routes.js')).href
      );
      const edition = app === 'aetherforge-commercial' ? 'commercial' : 'companion';
      const routes = createWorkbenchStaticRoutes(edition);
      assert.equal(routes.size, edition === 'commercial' ? 56 : 31);
      const inventoried = new Set(manifest.files.map((file) => file.path));
      for (const [url, [source, mime]] of routes) {
        const target = resolve(clean, 'apps', app, source);
        const rel = relative(clean, target);
        assert.ok(
          rel && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel),
          `${edition} static route escapes its distribution: ${url}`,
        );
        assert.ok(
          inventoried.has(rel.split(sep).join('/')),
          `${edition} route ${url} is missing its inventoried file: ${source}`,
        );
        assert.ok(typeof mime === 'string' && mime.length > 0, `${url} has no content type`);
      }
      assert.match(
        await readFile(join(clean, 'index.html'), 'utf8'),
        new RegExp(`http-equiv="refresh"[^>]+apps/${app}/index\\.html`),
      );
      assert.equal((await readdir(clean)).includes('node_modules'), false);
      const { createWorkbenchServer } = await import(
        pathToFileURL(join(clean, 'apps', app, 'server.mjs')).href
      );
      const server = createWorkbenchServer();
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      try {
        const base = `http://127.0.0.1:${server.address().port}`;
        const health = await (await fetch(`${base}/api/health`)).json();
        assert.equal(health.adapter, 'ready');
        assert.equal(health.source, 'maintained-library');
        const summary = await (await fetch(`${base}/api/workbench/summary`)).json();
        assert.ok(summary.moduleCount > 0);
        const html = await (await fetch(base)).text();
        // Smoke representative offline HTML, JavaScript, artwork, and
        // reference-library routes through each extracted, running server.
        // A mapped but absent file must never be hidden behind a 200.
        for (const route of [
          '/app.js',
          '/assets/aetherforge-logo.svg',
          '/assets/references/desktop-ui-concept.webp',
          '/aetherforge-corpus/index.html',
        ]) {
          const response = await fetch(`${base}${route}`);
          assert.equal(response.status, 200, `${edition} returned ${response.status} for ${route}`);
          assert.equal(response.headers.get('content-type'), routes.get(route)[1]);
          assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
          assert.ok((await response.arrayBuffer()).byteLength > 0, `${route} is empty`);
        }
        const notGet = await fetch(`${base}/assets/aetherforge-logo.svg`, { method: 'HEAD' });
        assert.equal(notGet.status, 404, 'Static assets must remain GET-only');

        // Every directly referenced script and stylesheet must actually be served.
        for (const [, path] of html.matchAll(/(?:src|href)="(\.\/[^"]+\.(?:js|css))"/gu)) {
          const response = await fetch(`${base}/${path.slice(2)}`);
          assert.equal(response.status, 200, path);
          assert.ok((await response.text()).length > 0);
        }
        const workflow = await fetch(`${base}/api/run`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'brush',
            inputs: { brushSize: 48, feather: 10, shape: 'circle', distance: 90 },
          }),
        });
        assert.equal(workflow.status, 200);
        const output = await workflow.json();
        assert.equal(output.result.brushSize, 48);
        assert.equal(output.result.strokeSteps, 11);
        assert.equal(output.status, 'computed');
        assert.equal(
          (await fetch(`${base}/evidence-center${name === 'Commercial' ? '.browser' : ''}.js`))
            .status,
          200,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    }));
}


test('refuses an output path whose existing parent aliases the source repository', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'distribution-output-alias-'));
  try {
    const source = join(temp, 'source');
    await mkdir(source);
    const alias = join(temp, 'source-alias');
    await symlink(source, alias, 'dir');
    assert.throws(() => assertOutsideRepository(join(alias, 'output'), source), /overlap repository/u);
    assert.deepEqual(await readdir(source), []);
  } finally { await rm(temp, {recursive: true, force: true}); }
});
