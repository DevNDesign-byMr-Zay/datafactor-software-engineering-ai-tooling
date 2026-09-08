import { jest } from '@jest/globals';

import {
  buildCloudRunServiceDescribeArgs,
  buildCloudRunTrafficShiftArgs,
  inspectCloudRunRelease,
  parseCloudRunServiceEvidence,
  rollbackCloudRunTraffic,
  shiftCloudRunTraffic,
} from '../../src/deployment/cloud-run-release-evidence.js';

const SERVICE_JSON = JSON.stringify({
  metadata: { name: 'roary-api' },
  status: {
    latestReadyRevisionName: 'roary-api-00042-abc',
    url: 'https://roary-api.example.run.app',
    traffic: [
      { revisionName: 'roary-api-00042-abc', percent: 90 },
      { revisionName: 'roary-api-00041-def', percent: 10, tag: 'previous' },
    ],
  },
});

describe('Cloud Run release evidence', () => {
  test('builds deterministic service describe arguments', () => {
    expect(
      buildCloudRunServiceDescribeArgs({
        serviceName: 'roary-api',
        region: 'us-east1',
      }),
    ).toEqual([
      'run',
      'services',
      'describe',
      'roary-api',
      '--region',
      'us-east1',
      '--format=json',
    ]);
  });

  test('builds explicit revision traffic-shift arguments', () => {
    expect(
      buildCloudRunTrafficShiftArgs({
        serviceName: 'roary-api',
        revisionName: 'roary-api-00042-abc',
        percent: 25,
      }),
    ).toEqual([
      'run',
      'services',
      'update-traffic',
      'roary-api',
      '--region',
      'us-central1',
      '--to-revisions',
      'roary-api-00042-abc=25',
      '--format=json',
    ]);
  });

  test('normalizes mechanically returned revision and traffic evidence', () => {
    expect(parseCloudRunServiceEvidence(SERVICE_JSON)).toEqual({
      serviceName: 'roary-api',
      latestReadyRevisionName: 'roary-api-00042-abc',
      url: 'https://roary-api.example.run.app',
      traffic: [
        {
          revisionName: 'roary-api-00042-abc',
          percent: 90,
          tag: null,
          url: null,
        },
        {
          revisionName: 'roary-api-00041-def',
          percent: 10,
          tag: 'previous',
          url: null,
        },
      ],
    });
  });

  test('captures revision inspection evidence through injected gcloud execution', async () => {
    const execFile = jest
      .fn()
      .mockResolvedValue({ exitCode: 0, stdout: SERVICE_JSON, stderr: '' });

    const evidence = await inspectCloudRunRelease({
      serviceName: 'roary-api',
      execFile,
    });

    expect(execFile).toHaveBeenCalledWith('gcloud', [
      'run',
      'services',
      'describe',
      'roary-api',
      '--region',
      'us-central1',
      '--format=json',
    ]);
    expect(evidence.stage).toBe('revision-inspect');
    expect(evidence.service.latestReadyRevisionName).toBe(
      'roary-api-00042-abc',
    );
  });

  test('captures explicit traffic-shift evidence without inventing revision state', async () => {
    const execFile = jest
      .fn()
      .mockResolvedValue({ code: 0, stdout: SERVICE_JSON, stderr: '' });

    const evidence = await shiftCloudRunTraffic({
      serviceName: 'roary-api',
      revisionName: 'roary-api-00042-abc',
      percent: 100,
      execFile,
    });

    expect(evidence.stage).toBe('traffic-shift');
    expect(evidence.args).toContain('roary-api-00042-abc=100');
    expect(evidence.service.traffic).toHaveLength(2);
  });

  test('rollback targets only an explicitly supplied prior revision', async () => {
    const execFile = jest
      .fn()
      .mockResolvedValue({ exitCode: 0, stdout: SERVICE_JSON, stderr: '' });

    const evidence = await rollbackCloudRunTraffic({
      serviceName: 'roary-api',
      priorRevisionName: 'roary-api-00041-def',
      execFile,
    });

    expect(evidence.stage).toBe('traffic-rollback');
    expect(evidence.args).toContain('roary-api-00041-def=100');
  });

  test('preserves failed process evidence and rejects invalid percentages', async () => {
    const execFile = jest.fn().mockResolvedValue({
      exitCode: 1,
      stdout: 'partial',
      stderr: 'denied',
    });

    await expect(
      inspectCloudRunRelease({ serviceName: 'roary-api', execFile }),
    ).rejects.toMatchObject({
      evidence: expect.objectContaining({
        stage: 'revision-inspect',
        exitCode: 1,
        stdout: 'partial',
        stderr: 'denied',
      }),
    });

    expect(() =>
      buildCloudRunTrafficShiftArgs({
        serviceName: 'roary-api',
        revisionName: 'roary-api-00042-abc',
        percent: 101,
      }),
    ).toThrow('percent must be an integer between 0 and 100');
  });

  test('preserves conventional rejected execFile process evidence', async () => {
    const processError = Object.assign(new Error('Command failed: gcloud'), {
      code: 1,
      stdout: 'partial describe output',
      stderr: 'permission denied',
    });
    const execFile = jest.fn().mockRejectedValue(processError);

    await expect(
      inspectCloudRunRelease({ serviceName: 'roary-api', execFile }),
    ).rejects.toMatchObject({
      message: 'revision-inspect failed with exit code 1',
      cause: processError,
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
        exitCode: 1,
        stdout: 'partial describe output',
        stderr: 'permission denied',
      },
    });
  });
});
