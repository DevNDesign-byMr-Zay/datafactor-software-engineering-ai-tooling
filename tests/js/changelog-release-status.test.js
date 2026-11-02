import { readFile } from 'node:fs/promises';

import { describe, expect, test } from '@jest/globals';

describe('published version is not called an unreleased candidate', () => {
  test('documents the v1.2.5 release and preserves the next-version placeholder', async () => {
    const content = await readFile(new URL('../../CHANGELOG.md', import.meta.url), 'utf8');
    const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
    expect(pkg.version).toMatch(/^1\.[0-9]+\.[0-9]+$/u);
    expect(content).toMatch(/^## Unreleased$/mu);
    expect(content).toMatch(/^## 1\.2\.5 — 2026-11-01 —/mu);
    expect(content).toContain('Current maintained package: `1.2.5`');
    if (pkg.version !== '1.2.5') {
      expect(content).toContain('Current package candidate: `' + pkg.version + '`');
    }
    expect(content).not.toContain('No v1.2.5 tag or published artifact is claimed');
  });
});
