import { buildRuntimeAcceptanceReceipt } from '../../src/runtime/runtime-acceptance-receipt.js';

describe('runtime acceptance receipt', () => {
  const acceptance = {
    accepted: true,
    bootstrap: {
      stage: 'readiness',
      readiness: [
        { name: 'backend:run', status: 'ready', detail: 'sensitive detail' },
        { name: 'health', status: 'ready', token: 'must-not-leak' },
      ],
    },
    release: {
      stage: 'revision-inspect',
      exitCode: 0,
      command: 'gcloud',
      args: ['must-not-be-copied'],
      stdout: 'raw output must not be copied',
      service: {
        serviceName: 'roary-api',
        latestReadyRevisionName: 'roary-api-00042-abc',
        url: ' https://roary-api.example.run.app ',
        traffic: [
          {
            revisionName: ' roary-api-00042-abc ',
            percent: 100,
            tag: ' stable ',
            url: ' https://stable.example.run.app ',
          },
        ],
      },
    },
  };

  test('creates a stable, sanitized evidence contract', () => {
    expect(
      buildRuntimeAcceptanceReceipt({
        acceptance,
        serviceName: ' roary-api ',
        region: ' us-central1 ',
      }),
    ).toEqual({
      contractVersion: 1,
      accepted: true,
      service: {
        name: 'roary-api',
        region: 'us-central1',
        latestReadyRevisionName: 'roary-api-00042-abc',
        traffic: [
          {
            revisionName: 'roary-api-00042-abc',
            percent: 100,
            tag: 'stable',
            url: 'https://stable.example.run.app',
          },
        ],
        url: 'https://roary-api.example.run.app',
      },
      bootstrap: {
        stage: 'readiness',
        readiness: [
          { name: 'backend:run', status: 'ready' },
          { name: 'health', status: 'ready' },
        ],
      },
      releaseEvidence: {
        stage: 'revision-inspect',
        exitCode: 0,
      },
    });
  });

  test('rejects an acceptance result that is not successful', () => {
    expect(() => buildRuntimeAcceptanceReceipt({ acceptance: { accepted: false } })).toThrow(
      'acceptance must be marked accepted',
    );
  });

  test('rejects incomplete release evidence', () => {
    expect(() =>
      buildRuntimeAcceptanceReceipt({
        acceptance: {
          accepted: true,
          bootstrap: {},
          release: { stage: 'revision-inspect', exitCode: 0, service: {} },
        },
      }),
    ).toThrow('serviceName must be a non-empty string');
  });
});
