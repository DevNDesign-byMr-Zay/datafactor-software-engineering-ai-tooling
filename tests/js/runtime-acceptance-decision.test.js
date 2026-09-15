import {
  decideRuntimeAcceptanceChange,
  RUNTIME_ACCEPTANCE_DECISIONS,
} from '../../src/runtime/runtime-acceptance-decision.js';
import { fingerprintRuntimeAcceptanceReceipt } from '../../src/runtime/runtime-acceptance-receipt.js';

const acceptedReceipt = {
  contractVersion: 1,
  accepted: true,
  service: {
    name: 'roary-api',
    region: 'us-central1',
    latestReadyRevisionName: 'roary-api-00042-abc',
    traffic: [{ revisionName: 'roary-api-00042-abc', percent: 100, tag: null, url: null }],
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

describe('runtime acceptance consumer decision', () => {
  test('classifies a first trusted receipt as changed', () => {
    expect(decideRuntimeAcceptanceChange(acceptedReceipt, undefined)).toBe(
      RUNTIME_ACCEPTANCE_DECISIONS.CHANGED,
    );
  });

  test('classifies an equivalent trusted receipt as unchanged', () => {
    const fingerprint = fingerprintRuntimeAcceptanceReceipt(acceptedReceipt);
    expect(decideRuntimeAcceptanceChange(acceptedReceipt, fingerprint)).toBe(
      RUNTIME_ACCEPTANCE_DECISIONS.UNCHANGED,
    );
  });

  test('classifies a different prior fingerprint as changed', () => {
    expect(decideRuntimeAcceptanceChange(acceptedReceipt, 'previous-fingerprint')).toBe(
      RUNTIME_ACCEPTANCE_DECISIONS.CHANGED,
    );
  });

  test('returns rejected without trusting rejected evidence', () => {
    expect(decideRuntimeAcceptanceChange({ accepted: false }, 'anything')).toBe(
      RUNTIME_ACCEPTANCE_DECISIONS.REJECTED,
    );
  });

  test('fails closed when diagnostics are smuggled into a trusted receipt', () => {
    expect(() =>
      decideRuntimeAcceptanceChange({ ...acceptedReceipt, stdout: 'provider output' }, undefined),
    ).toThrow(/unsupported field: stdout/);
  });

  test('rejects malformed consumer input', () => {
    expect(() => decideRuntimeAcceptanceChange(null, undefined)).toThrow(
      'receipt must be an object',
    );
  });

  test('rejects arrays as consumer input', () => {
    expect(() => decideRuntimeAcceptanceChange([], undefined)).toThrow('receipt must be an object');
  });
});
