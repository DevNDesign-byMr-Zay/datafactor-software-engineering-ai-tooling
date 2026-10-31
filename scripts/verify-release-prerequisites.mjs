import { readFile, writeFile } from 'node:fs/promises';

const REQUIRED_WORKFLOWS = Object.freeze(['engineering/ci', 'security/codeql']);
const SHA_PATTERN = /^[a-f0-9]{40}$/u;
const REPOSITORY_PATTERN = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/u;

/**
 * Build release evidence only from actual, completed, successful GitHub Actions
 * workflow runs. The most recent run for this exact main commit is authoritative:
 * a failed rerun must not be hidden by an earlier green result.
 */
export function verifyReleasePrerequisites({ runs, commit, repository }) {
  if (!SHA_PATTERN.test(commit)) throw new TypeError('Release commit must be a full Git SHA');
  if (!REPOSITORY_PATTERN.test(repository)) {
    throw new TypeError('Release repository must be owner/name');
  }
  if (!runs || !Array.isArray(runs.workflow_runs)) {
    throw new TypeError('GitHub workflow run response is required');
  }

  const evidence = {};
  for (const name of REQUIRED_WORKFLOWS) {
    const candidates = runs.workflow_runs
      .filter(
        (run) =>
          run &&
          run.name === name &&
          run.head_sha === commit &&
          run.head_branch === 'main' &&
          run.event === 'push' &&
          Number.isSafeInteger(run.id) &&
          run.id > 0,
      )
      .sort((left, right) => right.id - left.id);

    const latest = candidates[0];
    if (!latest || latest.status !== 'completed' || latest.conclusion !== 'success') {
      throw new Error(`Release blocked: no successful latest ${name} run for exact main commit`);
    }
    evidence[name] = Object.freeze({
      runId: latest.id,
      conclusion: 'success',
      url: `https://github.com/${repository}/actions/runs/${latest.id}`,
    });
  }
  return Object.freeze({
    schemaVersion: 1,
    evidenceType: 'github-actions-release-prerequisites',
    source: 'github-actions-api',
    commit,
    branch: 'main',
    workflows: Object.freeze(evidence),
  });
}

async function cli() {
  const [input, commit, output] = process.argv.slice(2);
  if (!input || !commit || !output) {
    throw new TypeError(
      'usage: verify-release-prerequisites <runs.json> <commit-sha> <output.json>',
    );
  }
  const raw = JSON.parse(await readFile(input, 'utf8'));
  const result = verifyReleasePrerequisites({
    runs: raw,
    commit,
    repository: process.env.GITHUB_REPOSITORY,
  });
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write('Release prerequisite workflows verified for exact main commit\n');
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  try {
    await cli();
  } catch (error) {
    process.stderr.write(`Release prerequisite verification failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
