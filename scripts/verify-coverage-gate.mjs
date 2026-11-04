import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const values = new Map();
try {
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    if (!['--summary', '--output', '--sha'].includes(key) || !args[index + 1] || values.has(key)) {
      throw new Error(
        'Usage: verify-coverage-gate.mjs [--summary FILE] [--output FILE] [--sha COMMIT]',
      );
    }
    values.set(key, args[index + 1]);
  }
  const commit = values.get('--sha') ?? process.env.GITHUB_SHA ?? null;
  if (commit !== null && !/^[a-f0-9]{40}$/u.test(commit)) throw new Error('Invalid commit SHA');
  const configBytes = await readFile(new URL('../jest.config.json', import.meta.url));
  const summaryBytes = await readFile(values.get('--summary') ?? 'coverage/coverage-summary.json');
  const config = JSON.parse(configBytes);
  const summary = JSON.parse(summaryBytes);
  const metrics = {};
  for (const name of ['statements', 'branches', 'functions', 'lines']) {
    const floor = config.coverageThreshold?.global?.[name];
    const value = summary.total?.[name];
    if (
      !Number.isFinite(floor) ||
      floor < 0 ||
      floor > 100 ||
      !value ||
      !Number.isInteger(value.total) ||
      value.total <= 0 ||
      !Number.isInteger(value.covered) ||
      value.covered < 0 ||
      value.covered > value.total ||
      !Number.isInteger(value.skipped) ||
      value.skipped < 0 ||
      value.skipped > value.total ||
      !Number.isFinite(value.pct) ||
      value.pct < 0 ||
      value.pct > 100 ||
      Math.abs(value.pct - (value.covered / value.total) * 100) > 0.011
    ) {
      throw new Error('Invalid coverage evidence or configured floor for ' + name);
    }
    metrics[name] = { floor, actual: value.pct, passed: value.pct >= floor };
  }
  const receipt = {
    schemaVersion: 1,
    evidenceType: 'jest-coverage-gate',
    commit,
    configSha256: createHash('sha256').update(configBytes).digest('hex'),
    summarySha256: createHash('sha256').update(summaryBytes).digest('hex'),
    metrics,
    passed: Object.values(metrics).every((metric) => metric.passed),
  };
  const output = resolve(values.get('--output') ?? 'coverage/coverage-gate.json');
  await mkdir(dirname(output), { recursive: true });
  const serialized = JSON.stringify(receipt, null, 2) + '\n';
  await writeFile(output, serialized);
  process.stdout.write(serialized);
  if (!receipt.passed) process.exitCode = 1;
} catch (error) {
  process.stderr.write('Coverage gate failed: ' + error.message + '\n');
  process.exitCode = 1;
}
