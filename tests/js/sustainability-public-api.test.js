import * as api from '../../src/index.js';

function createPackage(runId, { durationMs, estimatedEnergyWh, renewableRatio }) {
  const receipt = api.createSustainabilityReceipt({
    workload: { name: 'public-package-consumer', runId },
    durationMs,
    estimatedEnergyWh,
    renewableRatio,
  });
  const observation = api.createSustainabilityEfficiencyObservation(receipt);
  const metadata = api.createSustainabilityMetadata({
    energyWh: receipt.estimatedEnergyWh,
    renewableRatio: receipt.renewableRatio,
    source: 'public-api-test',
  });
  const efficiency = api.calculateSustainabilityEfficiency({
    durationMs: receipt.durationMs,
    estimatedEnergyWh: receipt.estimatedEnergyWh,
    renewableRatio: receipt.renewableRatio,
  });
  const bundle = api.createSustainabilityEvidenceBundle({ receipt, metadata, efficiency });
  const chain = api.createSustainabilityEvidenceChain({ receipt, observation, bundle });
  const evidenceExport = api.createSustainabilityEvidenceExport({
    receipt,
    observation,
    bundle,
    chain,
  });
  return api.createSustainabilityEvidencePackage({
    receipt,
    observation,
    bundle,
    chain,
    evidenceExport,
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
    expect(
      api.validateSustainabilityPackageComparison(comparison, { baseline, candidate }),
    ).toBe(true);
    expect(comparison.baselinePackageFingerprint).toBe(baseline.packageFingerprint);
    expect(comparison.candidatePackageFingerprint).toBe(candidate.packageFingerprint);
  });

  test('does not expose the loose receipt-comparison helper from the root entrypoint', () => {
    expect(api.compareSustainabilityReceipts).toBeUndefined();
    expect(api.validateSustainabilityComparison).toBeUndefined();
  });
});
