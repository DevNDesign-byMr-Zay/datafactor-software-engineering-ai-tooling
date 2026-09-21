import { readFile } from 'node:fs/promises';
import { test } from '@jest/globals';
import assert from 'node:assert/strict';

const PROMOTED = Object.freeze([
  "Software Engineering & AI Tooling/Frontend Engineering/JavaScript/Aster JavaScript v638.js",
  "Software Engineering & AI Tooling/Authentication & Security/Token Authentication Regression/06 FINAL CORRECTED CODE/auth_middleware.mjs",
  "Software Engineering & AI Tooling/API Foundations/Express Gemini Backend Foundation/06 FINAL CORRECTED CODE/cors_policy.mjs",
  "Software Engineering & AI Tooling/Storage & File Services/GCS Upload Pipeline/06 FINAL CORRECTED CODE/upload_route.mjs",
  "Software Engineering & AI Tooling/Storage & File Services/Signed URL File Access/06 FINAL CORRECTED CODE/sign_route.mjs",
  "Software Engineering & AI Tooling/AI Model Integration/Gemini File Aware Chat Pipeline/06 FINAL CORRECTED CODE/chat_route.mjs"
]);
const PACKAGE = new URL('../../package.json', import.meta.url);
const JEST_CONFIG = new URL('../../jest.config.js', import.meta.url);
const ESLINT_CONFIG = new URL('../../eslint.config.js', import.meta.url);
const SURFACE_DOC = new URL('../../docs/MAINTAINED_SURFACE.md', import.meta.url);

function corpusPaths(source) {
  return [...source.matchAll(/["']((?:Software Engineering & AI Tooling\/)[^"']+)["']/gu)]
    .map((match) => match[1]);
}

test('historical corpus enters coverage only through exact promoted paths', async () => {
  const source = await readFile(JEST_CONFIG, 'utf8');
  const paths = corpusPaths(source);

  assert.deepEqual(paths, PROMOTED);
  assert.ok(paths.every((path) => !path.includes('*')));
  assert.match(source, /'src\/\*\*\/\*\.js'/u);
});

test('maintained lint has no broad historical glob or stale legacy lane', async () => {
  const pkg = JSON.parse(await readFile(PACKAGE, 'utf8'));
  const eslint = await readFile(ESLINT_CONFIG, 'utf8');

  assert.equal(pkg?.scripts?.['lint:legacy'], undefined);
  for (const path of PROMOTED) {
    assert.ok(pkg.scripts.lint.includes(path), `lint must include exact promoted artifact: ${path}`);
    assert.ok(eslint.includes(path), `ESLint must include exact promoted artifact: ${path}`);
  }

  assert.doesNotMatch(pkg.scripts.lint, /Software Engineering & AI Tooling\/[^'"]*\*/u);
  assert.ok(corpusPaths(eslint).every((path) => !path.includes('*')));
});

test('maintained-surface documentation excludes soft-failing legacy lint', async () => {
  const doc = await readFile(SURFACE_DOC, 'utf8');

  assert.doesNotMatch(doc, /lint:legacy/u);
  assert.match(doc, /excluded from routine maintained linting/u);
  assert.match(doc, /intentionally promoted with focused tests/u);
});
