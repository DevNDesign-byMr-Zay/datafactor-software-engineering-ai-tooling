import {
  buildRuntimeAcceptanceReceipt,
  decideRuntimeAcceptanceChange,
  diffRuntimeAcceptanceReceipts,
  explainRuntimeAcceptanceDiff,
  fingerprintRuntimeAcceptanceReceipt,
  RUNTIME_ACCEPTANCE_DECISIONS,
} from '../../src/index.js';

function receipt(revision, readiness = 'ready') {
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
          traffic: [{ revisionName: revision, percent: 100, tag: null, url: null }],
        },
      },
    },
  });
}

describe('runtime acceptance consumer flow', () => {
  test('provides a complete trusted observation explanation', () => {
    const previous = receipt('revision-a');
    const current = receipt('revision-b', 'degraded');
    const previousFingerprint = fingerprintRuntimeAcceptanceReceipt(previous);
    const decision = decideRuntimeAcceptanceChange(current, previousFingerprint);
    const changes = diffRuntimeAcceptanceReceipts(previous, current);
    const explanation = explainRuntimeAcceptanceDiff(changes);

    expect(decision).toBe(RUNTIME_ACCEPTANCE_DECISIONS.CHANGED);
    expect(explanation.map(({ message }) => message)).toEqual([
      'ready revision changed',
      'readiness changed',
      'traffic allocation changed',
    ]);
  });
});
