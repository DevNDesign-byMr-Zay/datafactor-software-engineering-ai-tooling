import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../../scripts/verify-coverage-gate.mjs', import.meta.url));
const sha = 'a'.repeat(40);
const measured = () => ({
  total: Object.fromEntries(
    ['statements', 'branches', 'functions', 'lines'].map((name) => [
      name,
      { total: 100, covered: 90, skipped: 0, pct: 90 },
    ]),
  ),
});

function run(summary, inspect) {
  const directory = mkdtempSync(join(tmpdir(), 'coverage-receipt-'));
  try {
    const input = join(directory, 'summary.json');
    const output = join(directory, 'gate.json');
    writeFileSync(input, JSON.stringify(summary));
    const result = spawnSync(
      process.execPath,
      [script, '--summary', input, '--output', output, '--sha', sha],
      { encoding: 'utf8' },
    );
    inspect(result, () => JSON.parse(readFileSync(output, 'utf8')));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('reports enforced floors alongside measured coverage and the tested commit', () => {
  run(measured(), (result, receipt) => {
    expect(result.status).toBe(0);
    expect(receipt()).toMatchObject({
      commit: sha,
      passed: true,
      metrics: { statements: { floor: 85, actual: 90 }, branches: { floor: 75, actual: 90 } },
    });
    expect(receipt().configSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(receipt().summarySha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(JSON.parse(result.stdout)).toEqual(receipt());
  });
});

test.each([
  ['statements', 84],
  ['branches', 74],
  ['functions', 84],
  ['lines', 84],
])('rejects measured %s below its configured floor', (name, covered) => {
  const summary = measured();
  summary.total[name].covered = covered;
  summary.total[name].pct = covered;
  run(summary, (result, receipt) => {
    expect(result.status).toBe(1);
    expect(receipt().passed).toBe(false);
    expect(receipt().metrics[name].passed).toBe(false);
  });
});

test.each(['missing', 'empty', 'inconsistent', 'nonfinite'])(
  'refuses %s coverage evidence rather than issuing a pass',
  (kind) => {
    const summary = measured();
    if (kind === 'missing') delete summary.total.lines;
    if (kind === 'empty') summary.total.lines = { total: 0, covered: 0, skipped: 0, pct: 100 };
    if (kind === 'inconsistent') summary.total.lines.pct = 99;
    if (kind === 'nonfinite') summary.total.lines.pct = null;
    run(summary, (result) => {
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/invalid.*lines/iu);
    });
  },
);
