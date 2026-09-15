import {
  createSustainabilityEfficiencyObservation,
} from './efficiency-observation.js';
import { createSustainabilityEvidenceBundle } from './evidence-bundle.js';
import { createSustainabilityEvidenceChain } from './evidence-chain.js';
import { createSustainabilityEvidenceExport } from './evidence-export.js';
import { createSustainabilityEvidencePackage } from './evidence-package.js';
import { createSustainabilityReceipt } from './execution-receipt.js';
import {
  compareSustainabilityEvidencePackages,
  validateSustainabilityPackageComparison,
} from './package-comparison.js';

function createPackage(runId, { durationMs, estimatedEnergyWh, renewableRatio }) {
  const receipt = createSustainabilityReceipt({
    workload: { name: 'package-comparison', runId },
    durationMs,
    estimatedEnergyWh,
    renewableRatio,
  });
  const observation = createSustainabilityEfficiencyObservation(receipt);
  const bundle = createSustainabilityEvidenceBundle({
    receipt,
    metadata: {
      energyWh: receipt.estimatedEnergyWh,
      renewableRatio: receipt.renewableRatio,
      source: 'package-comparison-test',
    },
    efficiency: {
      energyPerSecondWh: receipt.estimatedEnergyWh / (receipt.durationMs / 1000),
    },
  });
  const chain = createSustainabilityEvidenceChain({ receipt, observation, bundle });
  const evidenceExport = createSustainabilityEvidenceExport({
    receipt,
    observation,
    bundle,
    chain,
  });
  return createSustainabilityEvidencePackage({
    receipt,
    observation,
    bundle,
    chain,
    evidenceExport,
  });
}

describe('sustainability package comparison', () => {
  test('binds one observational comparison to two verified packages', () => {
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

    const result = compareSustainabilityEvidencePackages({ baseline, candidate });

    expect(validateSustainabilityPackageComparison(result, { baseline, candidate })).toBe(true);
    expect(result.baselinePackageFingerprint).toBe(baseline.packageFingerprint);
    expect(result.candidatePackageFingerprint).toBe(candidate.packageFingerprint);
    expect(result.comparison.baselineFingerprint).toBe(baseline.receipt.receiptFingerprint);
    expect(result.comparison.candidateFingerprint).toBe(candidate.receipt.receiptFingerprint);
    expect(result.safety).toEqual({
      advisoryOnly: true,
      authoritative: false,
      selectsWinner: false,
      recommendsAction: false,
      schedulesWorkloads: false,
      deploysWorkloads: false,
      physicalActuation: false,
    });
  });

  test('survives JSON transport while remaining pinned to the same packages', () => {
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
    const result = compareSustainabilityEvidencePackages({ baseline, candidate });

    expect(
      validateSustainabilityPackageComparison(JSON.parse(JSON.stringify(result)), {
        baseline: JSON.parse(JSON.stringify(baseline)),
        candidate: JSON.parse(JSON.stringify(candidate)),
      }),
    ).toBe(true);
  });

  test('rejects package substitution and package-level authority widening', () => {
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
    const substitute = createPackage('substitute', {
      durationMs: 1400,
      estimatedEnergyWh: 7,
      renewableRatio: 0.75,
    });
    const result = compareSustainabilityEvidencePackages({ baseline, candidate });

    expect(validateSustainabilityPackageComparison(result, { baseline, candidate: substitute })).toBe(
      false,
    );
    expect(
      validateSustainabilityPackageComparison(
        {
          ...result,
          safety: { ...result.safety, authoritative: true },
        },
        { baseline, candidate },
      ),
    ).toBe(false);
  });

  test('refuses loose or tampered package inputs before comparing receipts', () => {
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

    expect(() =>
      compareSustainabilityEvidencePackages({
        baseline: baseline.receipt,
        candidate,
      }),
    ).toThrow(/validated baseline sustainability package/);
    expect(() =>
      compareSustainabilityEvidencePackages({
        baseline,
        candidate: { ...candidate, packageFingerprint: '0'.repeat(64) },
      }),
    ).toThrow(/validated candidate sustainability package/);
  });
});
