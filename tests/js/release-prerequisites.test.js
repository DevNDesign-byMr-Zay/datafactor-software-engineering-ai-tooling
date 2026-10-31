import { describe, expect, test } from '@jest/globals';

import { verifyReleasePrerequisites } from '../../scripts/verify-release-prerequisites.mjs';

const commit = 'a'.repeat(40);
const repository = 'DevNDesign-byMr-Zay/datafactor-software-engineering-ai-tooling';

function run(name, id, overrides = {}) {
  return {
    id,
    name,
    head_sha: commit,
    head_branch: 'main',
    event: 'push',
    status: 'completed',
    conclusion: 'success',
    ...overrides,
  };
}

const success = () => ({
  workflow_runs: [run('engineering/ci', 101), run('security/codeql', 102)],
});

describe('commit-bound GitHub release prerequisites', () => {
  test('accepts successful CI and CodeQL for the exact main commit and records run IDs', () => {
    expect(verifyReleasePrerequisites({ runs: success(), commit, repository })).toEqual({
      schemaVersion: 1,
      evidenceType: 'github-actions-release-prerequisites',
      source: 'github-actions-api',
      commit,
      branch: 'main',
      workflows: {
        'engineering/ci': {
          runId: 101,
          conclusion: 'success',
          url: `https://github.com/${repository}/actions/runs/101`,
        },
        'security/codeql': {
          runId: 102,
          conclusion: 'success',
          url: `https://github.com/${repository}/actions/runs/102`,
        },
      },
    });
  });

  test.each([
    ['missing CodeQL', { workflow_runs: [run('engineering/ci', 101)] }],
    [
      'failed CI',
      {
        workflow_runs: [
          run('engineering/ci', 101, { conclusion: 'failure' }),
          run('security/codeql', 102),
        ],
      },
    ],
    [
      'skipped CodeQL',
      {
        workflow_runs: [
          run('engineering/ci', 101),
          run('security/codeql', 102, { conclusion: 'skipped' }),
        ],
      },
    ],
    [
      'incomplete CI',
      {
        workflow_runs: [
          run('engineering/ci', 101, { status: 'in_progress', conclusion: null }),
          run('security/codeql', 102),
        ],
      },
    ],
    [
      'different SHA',
      {
        workflow_runs: [
          run('engineering/ci', 101, { head_sha: 'b'.repeat(40) }),
          run('security/codeql', 102),
        ],
      },
    ],
    [
      'unprotected branch',
      {
        workflow_runs: [
          run('engineering/ci', 101, { head_branch: 'feature' }),
          run('security/codeql', 102),
        ],
      },
    ],
    [
      'pull request run',
      {
        workflow_runs: [
          run('engineering/ci', 101, { event: 'pull_request' }),
          run('security/codeql', 102),
        ],
      },
    ],
  ])('fails closed for %s', (_label, runs) => {
    expect(() => verifyReleasePrerequisites({ runs, commit, repository })).toThrow(
      /Release blocked/u,
    );
  });

  test('does not hide a later failed or queued run behind an older successful run', () => {
    const runs = success();
    runs.workflow_runs.push(run('engineering/ci', 103, { conclusion: 'failure' }));
    expect(() => verifyReleasePrerequisites({ runs, commit, repository })).toThrow(
      /Release blocked/u,
    );
    runs.workflow_runs[2] = run('engineering/ci', 104, { status: 'queued', conclusion: null });
    expect(() => verifyReleasePrerequisites({ runs, commit, repository })).toThrow(
      /Release blocked/u,
    );
  });

  test('rejects invalid GitHub responses or commit/repository parameters', () => {
    expect(() => verifyReleasePrerequisites({ runs: null, commit, repository })).toThrow(
      /workflow run response/u,
    );
    expect(() =>
      verifyReleasePrerequisites({ runs: success(), commit: 'main', repository }),
    ).toThrow(/full Git SHA/u);
    expect(() =>
      verifyReleasePrerequisites({ runs: success(), commit, repository: 'invalid' }),
    ).toThrow(/owner\/name/u);
  });
});
