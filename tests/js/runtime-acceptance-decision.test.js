import {
  decideRuntimeAcceptanceChange,
  RUNTIME_ACCEPTANCE_DECISIONS,
} from '../../src/runtime/runtime-acceptance-decision.js';
import { fingerprintRuntimeAcceptanceReceipt } from '../../src/runtime/runtime-acceptance-receipt.js';

const receipt = {
  contractVersion: 1,
  accepted: true,
  service: {
    name: 'roary-api',
    region: 'us-central1',
    latestReadyRevisionName: 'roary-api-00042-abc',
    traffic: [],
    url: null,
  },
  bootstrap: {
    stage: 'readiness',
    readiness: [{ name: 'health', status: 'ready' }],
  },
  releaseEvidence: {
    stage: 'revision-inspect',
    exitCode: 0,
  },
};

describe('runtime acceptance decision', () => {
  test('returns unchanged when the trusted fingerprint matches', () => {
    const fingerprint = fingerprintRuntimeAcceptanceReceipt(receipt);

    expect(decideRuntimeAcceptanceChange(receipt, fingerprint)).toBe(
      RUNTIME_ACCEPTANCE_DECISIONS.UNCHANGED,
    );
  });

  test('returns changed when the trusted fingerprint differs', () => {
    expect(decideRuntimeAcceptanceChange(receipt, 'previous-trusted-fingerprint')).toBe(
      RUNTIME_ACCEPTANCE_DECISIONS.CHANGED,
    );
  });

  test('returns rejected before attempting to fingerprint rejected evidence', () => {
    expect(decideRuntimeAcceptanceChange({ accepted: false }, 'anything')).toBe(
      RUNTIME_ACCEPTANCE_DECISIONS.REJECTED,
    );
  });

  test('fails clearly for malformed consumer input', () => {
    expect(() => decideRuntimeAcceptanceChange(null, 'anything')).toThrow(
      'receipt must be an object',
    );
  });

  test('does not treat an omitted prior fingerprint as an unchanged observation', () => {
    expect(decideRuntimeAcceptanceChange(receipt)).toBe(RUNTIME_ACCEPTANCE_DECISIONS.CHANGED);
  });
});
