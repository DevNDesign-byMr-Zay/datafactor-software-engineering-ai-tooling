import {
  buildRuntimeAcceptanceReceipt,
  fingerprintRuntimeAcceptanceReceipt,
  serializeRuntimeAcceptanceReceipt,
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
      url: null,
    },
  },
};

describe('runtime acceptance receipt boundaries', () => {
  test('rejects inherited receipt fields during fingerprinting', () => {
    const receipt = buildRuntimeAcceptanceReceipt({ acceptance });
    const polluted = Object.create(receipt);
    polluted.providerOutput = 'should not be trusted';

    expect(() => fingerprintRuntimeAcceptanceReceipt(polluted)).not.toThrow();
    expect(fingerprintRuntimeAcceptanceReceipt(polluted)).toBe(
      fingerprintRuntimeAcceptanceReceipt(receipt),
    );
  });

  test('serializes equivalent traffic independent of input order', () => {
    const first = buildRuntimeAcceptanceReceipt({ acceptance });
    const reversed = buildRuntimeAcceptanceReceipt({
      acceptance: {
        ...acceptance,
        release: {
          ...acceptance.release,
          service: {
            ...acceptance.release.service,
            traffic: [...acceptance.release.service.traffic].reverse(),
          },
        },
      },
    });

    expect(serializeRuntimeAcceptanceReceipt(first)).toBe(
      serializeRuntimeAcceptanceReceipt(reversed),
    );
  });
});
