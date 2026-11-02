import { readFile } from 'node:fs/promises';

import { describe, expect, test } from '@jest/globals';

import { buildLockedPythonInventory } from '../../scripts/build-locked-python-inventory.mjs';

const hashA = 'a'.repeat(64);
const hashB = 'b'.repeat(64);
const pins = 'Example_Package==1.0.0\nanother-package==2.1.0\n';
const hashed =
  'example-package==1.0.0 \\\n --hash=sha256:' +
  hashA +
  '\nanother.package==2.1.0 \\\n --hash=sha256:' +
  hashB +
  '\n';

describe('release dependency evidence is generated from exact hash-verified pins', () => {
  test('builds a deterministic normalized package inventory', () => {
    const record = buildLockedPythonInventory(pins, hashed);
    expect(record.schemaVersion).toBe(1);
    expect(record.packageCount).toBe(2);
    expect(record.packages).toEqual([
      { name: 'another-package', version: '2.1.0', sha256Hashes: [hashB] },
      { name: 'example-package', version: '1.0.0', sha256Hashes: [hashA] },
    ]);
    expect(record.source.exactLockSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(record.source.artifactLockSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(buildLockedPythonInventory(pins, hashed)).toEqual(record);
  });
  test.each([
    ['version drift', pins, hashed.replace('2.1.0', '2.2.0')],
    ['missing package', pins, hashed.split('another.package==')[0]],
    ['missing hash', 'a==1\n', 'a==1\n'],
    ['duplicate pin', 'a==1\na==1\n', 'a==1 \\\n --hash=sha256:' + hashA + '\n'],
    ['duplicate hash', 'a==1\n', 'a==1 \\\n --hash=sha256:' + hashA + ' \\\n --hash=sha256:' + hashA + '\n'],
    ['invalid hash', 'a==1\n', 'a==1 \\\n --hash=sha256:NOT-A-HASH\n'],
    ['unexpected directive', 'a==1\n', '-r requirements.txt\n'],
  ])('rejects %s', (_label, exact, artifact) => {
    expect(() => buildLockedPythonInventory(exact, artifact)).toThrow();
  });
  test('matches the real maintained lockfile and known verified hash inventory', async () => {
    const [locked, hashedLock] = await Promise.all([
      readFile(new URL('../../requirements.lock.txt', import.meta.url), 'utf8'),
      readFile(new URL('../../requirements.hashed.txt', import.meta.url), 'utf8'),
    ]);
    const inventory = buildLockedPythonInventory(locked, hashedLock);
    expect(inventory.packageCount).toBeGreaterThan(0);
    expect(inventory.packages).toHaveLength(inventory.packageCount);
    expect(inventory.packages.every((item) => item.sha256Hashes.length > 0)).toBe(true);
  });
  test('keeps release evidence sourced from the verified lock, not runner pip list', async () => {
    const release = await readFile(
      new URL('../../.github/workflows/release.yml', import.meta.url),
      'utf8',
    );
    expect(release).toContain(
      'node scripts/build-locked-python-inventory.mjs --output python-dependencies.json',
    );
    expect(release).not.toContain('python -m pip list --format=json > python-dependencies.json');
    expect(release).toContain(
      'sha256sum sbom.cdx.json python-dependencies.json release-commit.txt',
    );
  });
});
