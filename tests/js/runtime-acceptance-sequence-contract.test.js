import {
  decideRuntimeAcceptanceChange,
  RUNTIME_ACCEPTANCE_DECISIONS,
} from '../../src/runtime/runtime-acceptance-decision.js';
import {
  buildRuntimeAcceptanceReceipt,
  fingerprintRuntimeAcceptanceReceipt,
} from '../../src/runtime/runtime-acceptance-receipt.js';

function acceptance(revisionName) {
  return {
    accepted: true,
    bootstrap: {
      stage: 'readiness',
      readiness: [{ name: 'health', status: 'ready' }],
    },
    release: {
      stage: 'revision-inspect',
      exitCode: 0,
      service: {
        serviceName: 'roary-api',
        latestReadyRevisionName: revisionName,
        traffic: [{ revisionName, percent: 100, tag: null, url: null }],
      },
    },
  };
}

describe('runtime acceptance sequence contract', () => {
  test('keeps rejection outside the trusted fingerprint sequence', () => {
    const trustedReceipt = buildRuntimeAcceptanceReceipt({
      acceptance: acceptance('roary-api-00042-a'),
      region: 'us-central1',
    });
    const equivalentReceipt = buildRuntimeAcceptanceReceipt({
      acceptance: acceptance('roary-api-00042-a'),
      region: 'us-central1',
    });
    const trustedFingerprint = fingerprintRuntimeAcceptanceReceipt(trustedReceipt);

    expect(decideRuntimeAcceptanceChange(trustedReceipt, undefined)).toBe(
      RUNTIME_ACCEPTANCE_DECISIONS.CHANGED,
    );
    expect(decideRuntimeAcceptanceChange({ accepted: false }, trustedFingerprint)).toBe(
      RUNTIME_ACCEPTANCE_DECISIONS.REJECTED,
    );
    expect(decideRuntimeAcceptanceChange(equivalentReceipt, trustedFingerprint)).toBe(
      RUNTIME_ACCEPTANCE_DECISIONS.UNCHANGED,
    );
  });

  test('classifies a changed accepted receipt against the last trusted fingerprint', () => {
    const trustedReceipt = buildRuntimeAcceptanceReceipt({
      acceptance: acceptance('roary-api-00042-a'),
      region: 'us-central1',
    });
    const changedReceipt = buildRuntimeAcceptanceReceipt({
      acceptance: acceptance('roary-api-00043-b'),
      region: 'us-central1',
    });

    expect(
      decideRuntimeAcceptanceChange(
        changedReceipt,
        fingerprintRuntimeAcceptanceReceipt(trustedReceipt),
      ),
    ).toBe(RUNTIME_ACCEPTANCE_DECISIONS.CHANGED);
  });
});
