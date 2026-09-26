import { access, readFile } from 'node:fs/promises';
import { test } from '@jest/globals';
import assert from 'node:assert/strict';

const CORPUS_ROOT = new URL('../../Software Engineering & AI Tooling/', import.meta.url);
const PACKAGE = new URL('../../package.json', import.meta.url);
const JEST_CONFIG = new URL('../../jest.config.js', import.meta.url);
const ESLINT_CONFIG = new URL('../../eslint.config.js', import.meta.url);
const PYPROJECT = new URL('../../pyproject.toml', import.meta.url);
const SURFACE = new URL('../../config/maintained-surface.json', import.meta.url);
const SURFACE_DOC = new URL('../../docs/MAINTAINED_SURFACE.md', import.meta.url);

test('historical corpus is externalized from the scored maintained tree', async () => {
  await assert.rejects(access(CORPUS_ROOT), (error) => error?.code === 'ENOENT');
});

test('JavaScript coverage measures maintained source only', async () => {
  const source = await readFile(JEST_CONFIG, 'utf8');

  assert.match(source, /'src\/\*\*\/\*\.js'/u);
  assert.match(source, /'src\/promoted\/\*\.mjs'/u);
  assert.doesNotMatch(source, /Software Engineering & AI Tooling/u);
});

test('lint, formatting, and Python quality paths do not depend on archive files', async () => {
  const pkg = JSON.parse(await readFile(PACKAGE, 'utf8'));
  const eslint = await readFile(ESLINT_CONFIG, 'utf8');
  const pyproject = await readFile(PYPROJECT, 'utf8');

  assert.doesNotMatch(pkg.scripts.lint, /Software Engineering & AI Tooling/u);
  assert.doesNotMatch(pkg.scripts['format:check'], /Software Engineering & AI Tooling/u);
  assert.doesNotMatch(eslint, /Software Engineering & AI Tooling/u);
  assert.doesNotMatch(pyproject, /Software Engineering & AI Tooling/u);
  assert.equal(pkg.exports['./progress'], './src/promoted/adaptive-duration-progress.js');
});

test('surface manifest binds promoted copies to immutable archive provenance', async () => {
  const surface = JSON.parse(await readFile(SURFACE, 'utf8'));
  const doc = await readFile(SURFACE_DOC, 'utf8');

  assert.equal(surface.schemaVersion, 2);
  assert.equal(surface.historicalArchive.releaseTag, 'v1.2.2');
  assert.equal(
    surface.historicalArchive.releaseCommit,
    '25bf8b9e36b327b3001f8b12cd0709cf7f1b84ad',
  );
  assert.equal(surface.historicalArchive.fileCount, 1610);
  assert.equal(surface.promotedMaintainedArtifacts.length, 7);
  assert.match(doc, /archive\/historical-corpus-v1\.2\.2/u);
  assert.match(doc, /1,610/u);
});
