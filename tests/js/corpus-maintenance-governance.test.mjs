import { readFile } from 'node:fs/promises';
import { test } from '@jest/globals';
import assert from 'node:assert/strict';

const IMPORT_WORKFLOW = new URL('../../.github/workflows/import-drive.yml', import.meta.url);
const VERIFY_WORKFLOW = new URL('../../.github/workflows/verify-drive.yml', import.meta.url);
const IMPORTER = new URL('../../.github/scripts/import_drive.py', import.meta.url);
const FAILURES = new URL('../../IMPORT_FAILURES.json', import.meta.url);

for (const [name, file] of [
  ['import', IMPORT_WORKFLOW],
  ['verification', VERIFY_WORKFLOW],
]) {
  test(`${name} automation requires review before main changes`, async () => {
    const workflow = await readFile(file, 'utf8');

    assert.match(workflow, /workflow_dispatch:/u);
    assert.match(workflow, /pull-requests:\s*write/u);
    assert.match(workflow, /gh pr create/u);
    assert.doesNotMatch(workflow, /\[skip ci\]/iu);
    assert.doesNotMatch(workflow, /git push origin HEAD:main/u);
  });
}

test('corpus importer stages a complete mirror before replacing live provenance', async () => {
  const source = await readFile(IMPORTER, 'utf8');

  assert.match(source, /tempfile\.mkdtemp/u);
  assert.doesNotMatch(source, /shutil\.rmtree\(STAGING_ROOT\)/u);
  assert.match(source, /target = download_root\.joinpath/u);

  const failureGuard = source.indexOf('if failures:');
  const liveSwap = source.indexOf('STAGING_ROOT.rename(backup_root)');
  assert.ok(failureGuard >= 0, 'transaction must stop on blocked downloads');
  assert.ok(liveSwap > failureGuard, 'live corpus swap must happen only after the failure guard');
});

test('current corpus maintenance state has no unresolved import failures', async () => {
  const failures = JSON.parse(await readFile(FAILURES, 'utf8'));
  assert.deepEqual(failures, []);
});
