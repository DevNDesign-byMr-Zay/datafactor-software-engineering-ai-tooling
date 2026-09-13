import {
  buildRuntimeAcceptanceObservation,
  decideRuntimeAcceptanceChange,
  fingerprintRuntimeAcceptanceReceipt,
  RUNTIME_ACCEPTANCE_DECISIONS,
} from '../../src/index.js';

function accepted(revision) {
  return { accepted: true, revision };
}

function rejected() {
  return { accepted: false, reason: 'not trusted' };
}

describe('runtime acceptance rejection sequence', () => {
  test('does not replace the previous trusted fingerprint with rejection', () => {
    const first = accepted('revision-a');
    const rejectedObservation = rejected();
    const next = accepted('revision-a');

    const firstFingerprint = fingerprintRuntimeAcceptanceReceipt(first);
    const rejectionDecision = decideRuntimeAcceptanceChange(
      rejectedObservation,
      firstFingerprint,
    );
    const nextDecision = decideRuntimeAcceptanceChange(next, firstFingerprint);

    expect(rejectionDecision).toBe(RUNTIME_ACCEPTANCE_DECISIONS.REJECTED);
    expect(nextDecision).toBe(RUNTIME_ACCEPTANCE_DECISIONS.UNCHANGED);
    expect(buildRuntimeAcceptanceObservation({
      decision: nextDecision,
      changes: [],
    })).toEqual({
      decision: 'unchanged',
      changed: false,
      changeCount: 0,
      summary: 'No trusted acceptance changes detected.',
    });
  });
});
