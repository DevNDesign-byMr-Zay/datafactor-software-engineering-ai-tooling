import { consumeRuntimeAcceptanceEvidence } from '../../src/runtime/runtime-acceptance-consumer.js';
import { RUNTIME_ACCEPTANCE_DECISIONS } from '../../src/runtime/runtime-acceptance-decision.js';
import { fingerprintRuntimeAcceptanceReceipt } from '../../src/runtime/runtime-acceptance-receipt.js';
import { buildRuntimeAcceptanceConsumerFixture } from './fixtures/runtime-acceptance-consumer.js';

describe('runtime acceptance consumer replay', () => {
  test('retains the last trusted fingerprint across rejected evidence', () => {
    const receipt = buildRuntimeAcceptanceConsumerFixture();
    const fingerprint = fingerprintRuntimeAcceptanceReceipt(receipt);
    const tampered = `${fingerprint.slice(0, -1)}${fingerprint.endsWith('0') ? '1' : '0'}`;

    const first = consumeRuntimeAcceptanceEvidence({ receipt, receiptFingerprint: fingerprint });
    const rejected = consumeRuntimeAcceptanceEvidence({
      receipt,
      receiptFingerprint: tampered,
      previousFingerprint: first.fingerprint,
    });
    const replay = consumeRuntimeAcceptanceEvidence({
      receipt,
      receiptFingerprint: fingerprint,
      previousFingerprint: first.fingerprint,
    });

    expect(first.status).toBe(RUNTIME_ACCEPTANCE_DECISIONS.CHANGED);
    expect(rejected.status).toBe(RUNTIME_ACCEPTANCE_DECISIONS.REJECTED);
    expect(replay.status).toBe(RUNTIME_ACCEPTANCE_DECISIONS.UNCHANGED);
    expect(replay.fingerprint).toBe(fingerprint);
  });
});
