import { consumeRuntimeAcceptanceEvidence } from '../../src/index.js';
import { fingerprintRuntimeAcceptanceReceipt } from '../../src/runtime/runtime-acceptance-receipt.js';
import { runtimeAcceptanceConsumerFixture } from './fixtures/runtime-acceptance-consumer.js';

test('exports the verified runtime acceptance consumer through the maintained package surface', () => {
  const receiptFingerprint = fingerprintRuntimeAcceptanceReceipt(runtimeAcceptanceConsumerFixture);
  expect(
    consumeRuntimeAcceptanceEvidence({
      receipt: runtimeAcceptanceConsumerFixture,
      receiptFingerprint,
    }),
  ).toMatchObject({ status: 'changed', fingerprint: receiptFingerprint });
});
