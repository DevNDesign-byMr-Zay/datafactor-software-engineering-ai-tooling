import {
  buildRuntimeAcceptanceReceipt,
  fingerprintRuntimeAcceptanceReceipt,
} from '../../src/runtime/runtime-acceptance-receipt.js';

const acceptance = {
  accepted: true,
  bootstrap: {
    stage: 'readiness',
    readiness: [{ name: 'health', status: 'ready' }],
  },
  release: {
    stage: 'revision-inspect',
    exitCode: 0,
    service: {
      serviceName: 'roary-api',
      latestReadyRevisionName: 'roary-api-00042-abc',
      traffic: [{ revisionName: 'roary-api-00042-abc', percent: 100 }],
    },
  },
};

describe('runtime acceptance receipt prototype boundary', () => {
  test('does not let inherited unsupported fields alter a receipt fingerprint', () => {
    const receipt = buildRuntimeAcceptanceReceipt({ acceptance, region: 'us-central1' });
    const derived = Object.create(receipt);
    derived.stdout = 'provider output';

    expect(fingerprintRuntimeAcceptanceReceipt(derived)).toBe(
      fingerprintRuntimeAcceptanceReceipt(receipt),
    );
  });

  test('still rejects unsupported own fields', () => {
    const receipt = buildRuntimeAcceptanceReceipt({ acceptance, region: 'us-central1' });
    const unsafe = { ...receipt, stdout: 'provider output' };

    expect(() => fingerprintRuntimeAcceptanceReceipt(unsafe)).toThrow(
      'receipt contains unsupported field: stdout',
    );
  });
});
