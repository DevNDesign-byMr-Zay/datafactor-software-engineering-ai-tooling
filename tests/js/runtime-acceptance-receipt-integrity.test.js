import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRuntimeAcceptanceReceipt, fingerprintRuntimeAcceptanceReceipt } from '../../src/runtime/runtime-acceptance-receipt.js';

test('runtime acceptance receipt fingerprint is deterministic and detects evidence changes', () => {
  const acceptance = {
    bootstrap: { readiness: [{ name: 'health', status: 'ready' }] },
    release: { service: { serviceName: 'holo-runtime', latestReadyRevisionName: 'rev-1', traffic: [{ revisionName: 'rev-1', percent: 100 }] } },
    accepted: true,
  };
  const first = buildRuntimeAcceptanceReceipt({ acceptance, serviceName: 'holo-runtime', region: 'us-east1' });
  const second = buildRuntimeAcceptanceReceipt({ acceptance: structuredClone(acceptance), serviceName: 'holo-runtime', region: 'us-east1' });
  assert.equal(fingerprintRuntimeAcceptanceReceipt(first), fingerprintRuntimeAcceptanceReceipt(second));
  assert.notEqual(fingerprintRuntimeAcceptanceReceipt(first), fingerprintRuntimeAcceptanceReceipt({ ...first, accepted: false }));
});
