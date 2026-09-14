import {
  buildRuntimeAcceptanceReceipt,
  decideRuntimeAcceptanceChange,
  fingerprintRuntimeAcceptanceReceipt,
  RUNTIME_ACCEPTANCE_DECISIONS,
} from '../../src/index.js';

describe('runtime acceptance sequence contract', () => {
  const acceptance = (revision) => ({
    accepted: true,
    bootstrap: { stage: 'ready', readiness: [{ name: 'health', status: 'ready' }] },
    release: {
      stage: 'promoted',
      exitCode: 0,
      service: {
        serviceName: 'api',
        latestReadyRevisionName: revision,
        traffic: [{ revisionName: revision, percent: 100 }],
      },
    },
  });

  test('keeps rejection outside the trusted fingerprint sequence', () => {
    const trustedReceipt = buildRuntimeAcceptanceReceipt({ acceptance: acceptance('A') });
    const nextReceipt = buildRuntimeAcceptanceReceipt({ acceptance: acceptance('A') });
    const fingerprint = fingerprintRuntimeAcceptanceReceipt(trustedReceipt);

    expect(decideRuntimeAcceptanceChange(trustedReceipt, null)).toBe(
      RUNTIME_ACCEPTANCE_DECISIONS.CHANGED,
    );
    expect(decideRuntimeAcceptanceChange({ accepted: false }, fingerprint)).toBe(
      RUNTIME_ACCEPTANCE_DECISIONS.REJECTED,
    );
    expect(decideRuntimeAcceptanceChange(nextReceipt, fingerprint)).toBe(
      RUNTIME_ACCEPTANCE_DECISIONS.UNCHANGED,
    );
  });
});
