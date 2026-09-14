import {
  decideRuntimeAcceptanceChange,
  fingerprintRuntimeAcceptanceReceipt,
  RUNTIME_ACCEPTANCE_DECISIONS,
} from '../../src/index.js';

describe('runtime acceptance sequence contract', () => {
  test('keeps rejection outside the trusted fingerprint sequence', () => {
    const trustedReceipt = { accepted: true, revision: 'A' };
    const nextReceipt = { accepted: true, revision: 'A' };
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
