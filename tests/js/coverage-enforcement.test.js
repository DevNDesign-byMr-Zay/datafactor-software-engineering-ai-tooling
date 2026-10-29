import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import config from '../../jest.config.js';

test('the real Jest coverage gate rejects an unexecuted function', () => {
  expect(config.coverageThreshold.global).toEqual({
    branches: 75,
    functions: 85,
    lines: 85,
    statements: 85,
  });
  const directory = mkdtempSync(join(tmpdir(), 'coverage-gate-'));
  try {
    writeFileSync(join(directory, 'subject.cjs'), 'module.exports = () => 42;\n');
    writeFileSync(
      join(directory, 'subject.test.cjs'),
      "test('loads', () => expect(typeof require('./subject.cjs')).toBe('function'));\n",
    );
    const fixtureConfig = {
      rootDir: directory,
      testEnvironment: 'node',
      testMatch: ['**/*.test.cjs'],
      transform: {},
      collectCoverageFrom: ['subject.cjs'],
      coverageThreshold: config.coverageThreshold,
      coverageDirectory: join(directory, 'coverage'),
    };
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL('../../node_modules/jest/bin/jest.js', import.meta.url)),
        '--config',
        JSON.stringify(fixtureConfig),
        '--runInBand',
        '--coverage',
        '--no-cache',
      ],
      { encoding: 'utf8', timeout: 20000, env: { ...process.env, NODE_OPTIONS: '' } },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    const output = result.stdout + result.stderr;
    expect(output).toMatch(/Tests:\s+1 passed/u);
    expect(output).toMatch(/coverage threshold for functions.*not met/iu);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 30000);
