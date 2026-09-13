import {
  buildRuntimeAcceptanceReceipt,
  decideRuntimeAcceptanceChange,
  diffRuntimeAcceptanceReceipts,
  fingerprintRuntimeAcceptanceReceipt,
  RUNTIME_ACCEPTANCE_DECISIONS,
} from '../../src/index.js';

function acceptedReceipt({ revision, trafficPercent = 100, readiness = 'ready' }) {
  return buildRuntimeAcceptanceReceipt({
    serviceName: 'roary-api',
    region: 'us-central1',
    acceptance: {
      accepted: true,
      bootstrap: {
        stage: 'readiness',
        readiness: [{ name: 'health', status: readiness }],
      },
      release: {
        stage: 'revision-inspect',
        exitCode: 0,
        service: {
          serviceName: 'roary-api',
          latestReadyRevisionName: revision,
          url: 'https://example.run.app',
          traffic: [{ revisionName: revision, percent: trafficPercent, tag: null, url: null }],
        },
      },
    },
  });
}

describe('runtime acceptance replay', () => {
  test('models first observation, repeat observation, and rollout change', () => {
    const observations = [
      acceptedReceipt({ revision: 'revision-a' }),
      acceptedReceipt({ revision: 'revision-a' }),
      acceptedReceipt({ revision: 'revision-b', trafficPercent: 90 }),
    ];

    let previousFingerprint;
    const decisions = [];

    for (const receipt of observations) {
      decisions.push(decideRuntimeAcceptanceChange(receipt, previousFingerprint));
      previousFingerprint = fingerprintRuntimeAcceptanceReceipt(receipt);
    }

    expect(decisions).toEqual([
      RUNTIME_ACCEPTANCE_DECISIONS.CHANGED,
      RUNTIME_ACCEPTANCE_DECISIONS.UNCHANGED,
      RUNTIME_ACCEPTANCE_DECISIONS.CHANGED,
    ]);

    expect(diffRuntimeAcceptanceReceipts(observations[1], observations[2]).map((change) => change.field))
      .toEqual(['service.latestReadyRevisionName', 'service.traffic']);
  });

  test('models a degraded trusted readiness result as a semantic change', () => {
    const healthy = acceptedReceipt({ revision: 'revision-a' });
    const degraded = acceptedReceipt({ revision: 'revision-a', readiness: 'degraded' });

    expect(decideRuntimeAcceptanceChange(
      degraded,
      fingerprintRuntimeAcceptanceReceipt(healthy),
    )).toBe(RUNTIME_ACCEPTANCE_DECISIONS.CHANGED);

    expect(diffRuntimeAcceptanceReceipts(healthy, degraded)).toEqual([
      {
        field: 'bootstrap.readiness',
        previous: [{ name: 'health', status: 'ready' }],
        current: [{ name: 'health', status: 'degraded' }],
      },
    ]);
  });
});
