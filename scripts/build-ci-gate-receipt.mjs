import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIRED_GATES = Object.freeze([
  'javascript',
  'python',
  'fresh-clone-smoke',
  'container',
  'isolated-clone-check',
]);

function assert(ok, message) {
  if (!ok) throw new Error(`CI gate receipt: ${message}`);
}

function isRecord(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export function buildCiGateReceipt({ needs, sha, runId }) {
  assert(typeof sha === 'string' && /^[a-f0-9]{40}$/u.test(sha), 'invalid exact commit SHA');
  assert(/^[1-9][0-9]*$/u.test(String(runId)), 'invalid workflow run ID');
  const numericRunId = Number(runId);
  assert(Number.isSafeInteger(numericRunId), 'workflow run ID exceeds safe integer range');
  assert(isRecord(needs), 'job needs must be a JSON object');

  const actual = Object.keys(needs).sort();
  const expected = [...REQUIRED_GATES].sort();
  assert(
    actual.length === expected.length && actual.every((key, index) => key === expected[index]),
    'required prerequisite jobs differ from the approved gate set',
  );

  const conclusions = {};
  for (const name of REQUIRED_GATES) {
    const job = needs[name];
    assert(isRecord(job) && Object.hasOwn(job, 'result'), `missing job result for ${name}`);
    assert(job.result === 'success', `required prerequisite did not pass: ${name}`);
    conclusions[name] = 'success';
  }

  return {
    schemaVersion: 1,
    evidenceType: 'github-actions-prerequisite-outcomes',
    workflow: 'engineering/ci',
    commit: sha,
    runId: numericRunId,
    source: 'github-actions-needs-context',
    outcomes: conclusions,
    authority: 'Consult GitHub Actions for authoritative run and job conclusions',
  };
}

function cliOptions(args) {
  assert(args.length === 8, 'expected --input, --output, --sha and --run-id');
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    assert(['--input', '--output', '--sha', '--run-id'].includes(flag), 'unknown option');
    assert(!Object.hasOwn(values, flag), 'duplicate option');
    assert(typeof args[index + 1] === 'string' && args[index + 1], 'missing option value');
    values[flag] = args[index + 1];
  }
  assert(Object.keys(values).length === 4, 'missing required option');
  return values;
}

async function main() {
  const values = cliOptions(process.argv.slice(2));
  const raw = await readFile(values['--input'], 'utf8');
  const receipt = buildCiGateReceipt({
    needs: JSON.parse(raw),
    sha: values['--sha'],
    runId: values['--run-id'],
  });
  await writeFile(values['--output'], `${JSON.stringify(receipt, null, 2)}\n`, {
    flag: 'wx',
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
