import {
  buildRuntimeAcceptanceReceipt,
  fingerprintRuntimeAcceptanceReceipt,
  serializeRuntimeAcceptanceReceipt,
} from '../../src/runtime/runtime-acceptance-receipt.js';

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

  test('serializes equivalent traffic evidence deterministically', () => {
    const firstAcceptance = structuredClone(acceptance);
    firstAcceptance.release.service.traffic.push({
      revisionName: 'roary-api-00041-old',
      percent: 0,
      tag: null,
      url: null,
    });
    const secondAcceptance = structuredClone(firstAcceptance);
    secondAcceptance.release.service.traffic.reverse();

    const firstReceipt = buildRuntimeAcceptanceReceipt({
      acceptance: firstAcceptance,
      region: 'us-central1',
    });
    const secondReceipt = buildRuntimeAcceptanceReceipt({
      acceptance: secondAcceptance,
      region: 'us-central1',
    });

    expect(serializeRuntimeAcceptanceReceipt(firstReceipt)).toBe(
      serializeRuntimeAcceptanceReceipt(secondReceipt),
    );
    expect(fingerprintRuntimeAcceptanceReceipt(firstReceipt)).toBe(
      fingerprintRuntimeAcceptanceReceipt(secondReceipt),
    );
    expect(fingerprintRuntimeAcceptanceReceipt(firstReceipt)).toMatch(/^[a-f0-9]{64}$/);
  });

  test('serialization rejects unsupported fields instead of hashing operational noise', () => {
    const receipt = buildRuntimeAcceptanceReceipt({ acceptance, region: 'us-central1' });
    const unsafeReceipt = { ...receipt, stdout: 'raw output must not be copied' };

    expect(() => serializeRuntimeAcceptanceReceipt(unsafeReceipt)).toThrow(
      'receipt contains unsupported field: stdout',
    );
  });

  test('serialized receipt excludes command output, arguments, and readiness detail', () => {
    const receipt = buildRuntimeAcceptanceReceipt({ acceptance, region: 'us-central1' });
    const serialized = serializeRuntimeAcceptanceReceipt(receipt);

    expect(serialized).not.toContain('must-not-be-copied');
    expect(serialized).not.toContain('raw output must not be copied');
    expect(serialized).not.toContain('sensitive detail');
    expect(serialized).not.toContain('must-not-leak');
  });
});
