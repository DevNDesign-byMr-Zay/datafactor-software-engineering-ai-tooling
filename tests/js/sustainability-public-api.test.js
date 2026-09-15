import * as api from '../../src/index.js';

function createPackage(runId, { durationMs, estimatedEnergyWh, renewableRatio }) {
  return api.createSustainabilityEvidencePackageFromExecution({
    workload: { name: 'public-package-consumer', runId },
    durationMs,
    estimatedEnergyWh,
    renewableRatio,
    source: 'public-api-test',
  });
}

describe('sustainability public consumer API', () => {
  test('builds and compares sealed packages entirely through the maintained root entrypoint', () => {
    const baseline = createPackage('baseline', {
      durationMs: 2000,
      estimatedEnergyWh: 10,
      renewableRatio: 0.25,
    });
    const candidate = createPackage('candidate', {
      durationMs: 1500,
      estimatedEnergyWh: 8,
      renewableRatio: 0.5,
    });

    const comparison = api.compareSustainabilityEvidencePackages({ baseline, candidate });

    expect(api.validateSustainabilityEvidencePackage(baseline)).toBe(true);
    expect(api.validateSustainabilityEvidencePackage(candidate)).toBe(true);
    expect(api.validateSustainabilityPackageComparison(comparison, { baseline, candidate })).toBe(
      true,
    );
    expect(comparison.baselinePackageFingerprint).toBe(baseline.packageFingerprint);
    expect(comparison.candidatePackageFingerprint).toBe(candidate.packageFingerprint);
    expect(baseline.manifest.receiptFingerprint).toBe(baseline.receipt.receiptFingerprint);
    expect(baseline.manifest.observationFingerprint).toBe(
      baseline.observation.observationFingerprint,
    );
    expect(baseline.manifest.bundleFingerprint).toBe(baseline.bundle.bundleFingerprint);
    expect(baseline.manifest.chainFingerprint).toBe(baseline.chain.chainFingerprint);
    expect(baseline.manifest.exportFingerprint).toBe(baseline.evidenceExport.exportFingerprint);
  });

  test('creates deterministic package identity from equivalent execution evidence', () => {
    const input = {
      durationMs: 1250,
      estimatedEnergyWh: 6,
      renewableRatio: 0.4,
    };
    const first = createPackage('deterministic', input);
    const second = createPackage('deterministic', input);

    expect(second).toEqual(first);
    expect(second.packageFingerprint).toBe(first.packageFingerprint);
  });

  test('does not expose the loose receipt-comparison helper from the root entrypoint', () => {
    expect(api.compareSustainabilityReceipts).toBeUndefined();
    expect(api.validateSustainabilityComparison).toBeUndefined();
  });
});
