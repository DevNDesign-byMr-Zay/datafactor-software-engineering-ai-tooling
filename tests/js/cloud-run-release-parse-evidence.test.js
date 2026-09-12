import { jest } from '@jest/globals';

import { inspectCloudRunRelease } from '../../src/deployment/cloud-run-release-evidence.js';

describe('Cloud Run release parse evidence', () => {
  test('preserves process evidence when successful gcloud output cannot be parsed', async () => {
    const execFile = jest.fn().mockResolvedValue({
      exitCode: 0,
      stdout: '{not-json',
      stderr: 'warning: partial response',
    });

    await expect(
      inspectCloudRunRelease({
        serviceName: 'roary-api',
        execFile,
      }),
    ).rejects.toMatchObject({
      message:
        'revision-inspect failed to parse service evidence: service describe returned invalid JSON',
      evidence: {
        stage: 'revision-inspect',
        command: 'gcloud',
        args: [
          'run',
          'services',
          'describe',
          'roary-api',
          '--region',
          'us-central1',
          '--format=json',
        ],
        exitCode: 0,
        stdout: '{not-json',
        stderr: 'warning: partial response',
      },
    });
  });
});
