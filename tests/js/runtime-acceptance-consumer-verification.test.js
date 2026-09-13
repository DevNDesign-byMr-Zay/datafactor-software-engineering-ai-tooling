import { consumeRuntimeAcceptanceEvidence } from '../../src/runtime/runtime-acceptance-consumer.js';
import { RUNTIME_ACCEPTANCE_DECISIONS } from '../../src/runtime/runtime-acceptance-decision.js';
import { fingerprintRuntimeAcceptanceReceipt } from '../../src/runtime/runtime-acceptance-receipt.js';
import { buildRuntimeAcceptanceConsumerFixture } from './fixtures/runtime-acceptance-consumer.js';

describe('runtime acceptance evidence consumer', () => {
  test('classifies a verified first trusted receipt as changed', () => {
    const receipt = buildRuntimeAcceptanceConsumerFixture();
    const receiptFingerprint = fingerprintRuntimeAcceptanceReceipt(receipt);

    const result = consumeRuntimeAcceptanceEvidence({ receipt, receiptFingerprint });

    expect(result).toEqual({
      status: RUNTIME_ACCEPTANCE_DECISIONS.CHANGED,
      fingerprint: receiptFingerprint,
      reason: null,
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  test('classifies the same verified receipt as unchanged', () => {
    const receipt = buildRuntimeAcceptanceConsumerFixture();
    const receiptFingerprint = fingerprintRuntimeAcceptanceReceipt(receipt);

    const result = consumeRuntimeAcceptanceEvidence({
      receipt,
      receiptFingerprint,
      previousFingerprint: receiptFingerprint,
    });

    expect(result.status).toBe(RUNTIME_ACCEPTANCE_DECISIONS.UNCHANGED);
    expect(result.fingerprint).toBe(receiptFingerprint);
  });

  test('rejects a tampered current fingerprint before comparison', () => {
    const receipt = buildRuntimeAcceptanceConsumerFixture();
    const receiptFingerprint = fingerprintRuntimeAcceptanceReceipt(receipt);
    const tamperedFingerprint = `${receiptFingerprint.slice(0, -1)}${
      receiptFingerprint.endsWith('0') ? '1' : '0'
    }`;

    expect(
      consumeRuntimeAcceptanceEvidence({
        receipt,
        receiptFingerprint: tamperedFingerprint,
        previousFingerprint: receiptFingerprint,
      }),
    ).toEqual({
      status: RUNTIME_ACCEPTANCE_DECISIONS.REJECTED,
      fingerprint: null,
      reason: 'receipt fingerprint mismatch',
    });
  });

  test('rejects malformed or rejected evidence without consulting diagnostics', () => {
    expect(
      consumeRuntimeAcceptanceEvidence({
        receipt: { accepted: false, release: { stdout: 'do not inspect me' } },
        receiptFingerprint: 'a'.repeat(64),
      }),
    ).toEqual({
      status: RUNTIME_ACCEPTANCE_DECISIONS.REJECTED,
      fingerprint: null,
      reason: 'acceptance rejected',
    });

    expect(
      consumeRuntimeAcceptanceEvidence({
        receipt: { ...buildRuntimeAcceptanceConsumerFixture(), stdout: 'provider output' },
        receiptFingerprint: 'a'.repeat(64),
      }),
    ).toEqual({
      status: RUNTIME_ACCEPTANCE_DECISIONS.REJECTED,
      fingerprint: null,
      reason: 'invalid receipt',
    });
  });
});
