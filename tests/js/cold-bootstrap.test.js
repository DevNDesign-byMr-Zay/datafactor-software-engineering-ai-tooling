import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../../scripts/verify-cold-bootstrap.sh', import.meta.url));

function fixture(check) {
  const root = mkdtempSync(join(tmpdir(), 'cold-bootstrap-'));
  try {
    check(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('refuses a source directory containing preinstalled Node dependencies', () =>
  fixture((root) => {
    mkdirSync(join(root, 'node_modules'));
    const result = spawnSync('bash', [script], { cwd: root, encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/preinstalled.*node_modules/iu);
  }));

test('refuses a populated registry cache before attempting installation', () =>
  fixture((root) => {
    const cache = join(root, 'npm-cache');
    mkdirSync(cache);
    writeFileSync(join(cache, 'entry'), 'cached');
    const result = spawnSync('bash', [script], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, NPM_CONFIG_CACHE: cache },
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/cache.*empty/iu);
  }));

test('propagates fresh-verification failure instead of printing a successful bootstrap', () =>
  fixture((root) => {
    const venv = join(root, 'venv');
    const setup = spawnSync('python', ['-m', 'venv', '--without-pip', venv], { encoding: 'utf8' });
    expect(setup.status).toBe(0);
    const bin = join(root, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'make'), '#!/bin/sh\nexit 17\n', { mode: 0o755 });
    const result = spawnSync('bash', [script], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: join(venv, 'bin') + ':' + bin + ':' + process.env.PATH,
        NPM_CONFIG_CACHE: join(root, 'npm-empty'),
        PIP_CACHE_DIR: join(root, 'pip-empty'),
      },
    });
    expect(result.status).toBe(17);
    expect(result.stdout).not.toMatch(/PASS: clean bootstrap/u);
  }));
