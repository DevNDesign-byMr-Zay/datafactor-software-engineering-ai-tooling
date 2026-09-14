import { expect, test } from '@jest/globals';
import {
  buildRuntimeAcceptanceReceipt,
  fingerprintRuntimeAcceptanceReceipt,
} from '../../src/runtime/runtime-acceptance-receipt.js';

test('runtime acceptance receipt fingerprint is deterministic and detects evidence changes', () => {
  const acceptance = {
    bootstrap: {
      stage: 'readiness',
      readiness: [{ name: 'health', status: 'ready' }],
    },
    release: {
      stage: 'revision-inspect',
      exitCode: 0,
      service: {
        serviceName: 'holo-runtime',
        latestReadyRevisionName: 'rev-1',
        traffic: [{ revisionName: 'rev-1', percent: 100 }],
        url: 'https://holo-runtime.example.run.app',
      },
    },
    accepted: true,
  };
  const first = buildRuntimeAcceptanceReceipt({
    acceptance,
    serviceName: 'holo-runtime',
    region: 'us-east1',
  });
  const second = buildRuntimeAcceptanceReceipt({
    acceptance: structuredClone(acceptance),
    serviceName: 'holo-runtime',
    region: 'us-east1',
  });
  expect(fingerprintRuntimeAcceptanceReceipt(first)).toBe(
    fingerprintRuntimeAcceptanceReceipt(second),
  );

  const changedAcceptance = structuredClone(acceptance);
  changedAcceptance.release.service.latestReadyRevisionName = 'rev-2';
  changedAcceptance.release.service.traffic = [{ revisionName: 'rev-2', percent: 100 }];
  const changed = buildRuntimeAcceptanceReceipt({
    acceptance: changedAcceptance,
    serviceName: 'holo-runtime',
    region: 'us-east1',
  });
  expect(fingerprintRuntimeAcceptanceReceipt(first)).not.toBe(
    fingerprintRuntimeAcceptanceReceipt(changed),
  );
});
