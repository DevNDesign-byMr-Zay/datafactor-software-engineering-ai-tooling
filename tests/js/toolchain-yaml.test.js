import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadNycConfig } = require('@istanbuljs/load-nyc-config');

test('Istanbul YAML configuration preserves includes, exclusions, thresholds and extends', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'tooling-yaml-'));
  try {
    await writeFile(join(cwd, 'package.json'), '{}');
    await writeFile(join(cwd, 'base.yml'), 'branches: 75\nall: true\n');
    await writeFile(
      join(cwd, '.nycrc.yml'),
      'extends: ./base.yml\ninclude:\n  - src/**/*.js\nexclude:\n  - tests/**\ncheck-coverage: true\nlines: 85\n',
    );
    const config = await loadNycConfig({ cwd });
    expect(config).toMatchObject({
      branches: 75,
      all: true,
      include: ['src/**/*.js'],
      exclude: ['tests/**'],
      checkCoverage: true,
      lines: 85,
    });
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
