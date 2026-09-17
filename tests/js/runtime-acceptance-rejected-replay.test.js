import { consumeRuntimeAcceptanceEvidence } from '../../src/runtime/runtime-acceptance-consumer.js';
import { RUNTIME_ACCEPTANCE_DECISIONS } from '../../src/runtime/runtime-acceptance-decision.js';
import { fingerprintRuntimeAcceptanceReceipt } from '../../src/runtime/runtime-acceptance-receipt.js';
import { runtimeAcceptanceConsumerFixture } from './fixtures/runtime-acceptance-consumer.js';

describe('runtime acceptance rejected replay', () => {
  test('keeps the last trusted fingerprint across rejected evidence', () => {
    const receipt = runtimeAcceptanceConsumerFixture;
    const fingerprint = fingerprintRuntimeAcceptanceReceipt(receipt);
    const tamperedFingerprint = `${fingerprint.slice(0, -1)}${fingerprint.endsWith('0') ? '1' : '0'}`;

    const first = consumeRuntimeAcceptanceEvidence({
      receipt,
      receiptFingerprint: fingerprint,
    });
    const rejected = consumeRuntimeAcceptanceEvidence({
      receipt,
      receiptFingerprint: tamperedFingerprint,
      previousFingerprint: first.fingerprint,
    });
    const replay = consumeRuntimeAcceptanceEvidence({
      receipt,
      receiptFingerprint: fingerprint,
      previousFingerprint: first.fingerprint,
    });

    expect(first.status).toBe(RUNTIME_ACCEPTANCE_DECISIONS.CHANGED);
    expect(first.fingerprint).toBe(fingerprint);
    expect(rejected.status).toBe(RUNTIME_ACCEPTANCE_DECISIONS.REJECTED);
    expect(rejected.fingerprint).toBeNull();
    expect(replay.status).toBe(RUNTIME_ACCEPTANCE_DECISIONS.UNCHANGED);
    expect(replay.fingerprint).toBe(fingerprint);
  });
});
