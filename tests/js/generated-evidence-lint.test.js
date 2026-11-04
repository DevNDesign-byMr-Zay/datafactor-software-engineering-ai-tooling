import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

test.each(['body', 'header'])(
  'the actual lint command rejects a hand-edited generated %s and accepts regeneration',
  (kind) => {
    const directory = mkdtempSync(join(tmpdir(), 'generated-lint-'));
    try {
      const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
      writeFileSync(
        join(directory, 'package.json'),
        JSON.stringify({ type: 'module', scripts: { lint: pkg.scripts.lint } }),
      );
      for (const file of [
        'eslint.config.js',
        'scripts/sync-evidence-center.mjs',
        'apps/aetherforge-workbench/evidence-center.js',
        'apps/aetherforge-commercial/evidence-center.js',
        'apps/aetherforge-commercial/evidence-center.browser.js',
      ]) {
        mkdirSync(dirname(join(directory, file)), { recursive: true });
        cpSync(join(root, file), join(directory, file));
      }
      for (const file of ['src/index.js', 'tests/js/example.js']) {
        mkdirSync(dirname(join(directory, file)), { recursive: true });
        writeFileSync(join(directory, file), 'export {};\n');
      }
      symlinkSync(join(root, 'node_modules'), join(directory, 'node_modules'), 'dir');
      const lint = () => spawnSync('npm', ['run', 'lint'], { cwd: directory, encoding: 'utf8' });
      const clean = lint();
      expect(clean.status).toBe(0);
      const generated = join(directory, 'apps/aetherforge-commercial/evidence-center.browser.js');
      const original = readFileSync(generated, 'utf8');
      writeFileSync(
        generated,
        kind === 'body'
          ? original + '\n// direct edit\n'
          : original.slice(original.indexOf('\n') + 1),
      );
      const changed = lint();
      expect(changed.status).toBe(1);
      expect(changed.stdout + changed.stderr).toMatch(/generated file out of sync/u);
      expect(readFileSync(generated, 'utf8')).not.toBe(original);
      const regenerated = spawnSync(
        process.execPath,
        ['scripts/sync-evidence-center.mjs', '--write'],
        { cwd: directory, encoding: 'utf8' },
      );
      expect(regenerated.status).toBe(0);
      expect(readFileSync(generated, 'utf8')).toBe(original);
      expect(lint().status).toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
  20000,
);
