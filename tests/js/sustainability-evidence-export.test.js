import { expect, test } from '@jest/globals';
import { createSustainabilityReceipt } from '../../src/sustainability/execution-receipt.js';
import { createSustainabilityEfficiencyObservation } from '../../src/sustainability/efficiency-observation.js';
import { calculateSustainabilityEfficiency } from '../../src/sustainability/efficiency-score.js';
import { createSustainabilityMetadata } from '../../src/sustainability/sustainability-metadata.js';
import { createSustainabilityEvidenceBundle } from '../../src/sustainability/evidence-bundle.js';
import { createSustainabilityEvidenceChain } from '../../src/sustainability/evidence-chain.js';
import {
  createSustainabilityEvidenceExport,
  validateSustainabilityEvidenceExport,
} from '../../src/sustainability/evidence-export.js';

function fixture(overrides = {}) {
  const receipt = createSustainabilityReceipt({
    workload: { name: 'scene-analysis', model: 'SOLVÆR' },
    durationMs: 3_600_000,
    estimatedEnergyWh: 20,
    renewableRatio: 0.25,
    ...overrides,
  });
  const observation = createSustainabilityEfficiencyObservation(receipt);
  const metadata = createSustainabilityMetadata({
    energyWh: receipt.estimatedEnergyWh,
    renewableRatio: receipt.renewableRatio,
    source: 'export-test',
  });
  const efficiency = calculateSustainabilityEfficiency({
    durationMs: receipt.durationMs,
    estimatedEnergyWh: receipt.estimatedEnergyWh,
    renewableRatio: receipt.renewableRatio,
  });
  const bundle = createSustainabilityEvidenceBundle({ receipt, metadata, efficiency });
  const chain = createSustainabilityEvidenceChain({ receipt, observation, bundle });
  return { receipt, observation, bundle, chain };
}

test('creates one deterministic consumer record for the complete evidence chain', () => {
  const artifacts = fixture();
  const first = createSustainabilityEvidenceExport(artifacts);
  const second = createSustainabilityEvidenceExport(artifacts);

  expect(first.exportFingerprint).toMatch(/^[a-f0-9]{64}$/);
  expect(first.exportFingerprint).toBe(second.exportFingerprint);
  expect(first.chainFingerprint).toBe(artifacts.chain.chainFingerprint);
  expect(first.averagePowerWatts).toBe(20);
  expect(first.estimatedNonRenewableShareEnergyWh).toBe(15);
  expect(first.safety).toEqual({
    advisoryOnly: true,
    authoritative: false,
    recommendsAction: false,
    schedulesWorkloads: false,
    deploysWorkloads: false,
    physicalActuation: false,
  });
  expect(Object.isFrozen(first)).toBe(true);
  expect(Object.isFrozen(first.safety)).toBe(true);
  expect(validateSustainabilityEvidenceExport(first, artifacts)).toBe(true);
});

test('rejects a valid export when any independently valid lineage artifact is substituted', () => {
  const artifacts = fixture();
  const evidenceExport = createSustainabilityEvidenceExport(artifacts);
  const alternate = fixture({ estimatedEnergyWh: 24 });

  expect(
    validateSustainabilityEvidenceExport(evidenceExport, {
      ...artifacts,
      bundle: alternate.bundle,
    }),
  ).toBe(false);
  expect(validateSustainabilityEvidenceExport(evidenceExport, alternate)).toBe(false);
});

test('rejects summary, authority, and fingerprint tampering', () => {
  const artifacts = fixture();
  const evidenceExport = createSustainabilityEvidenceExport(artifacts);

  expect(
    validateSustainabilityEvidenceExport(
      { ...evidenceExport, averagePowerWatts: evidenceExport.averagePowerWatts + 1 },
      artifacts,
    ),
  ).toBe(false);
  expect(
    validateSustainabilityEvidenceExport(
      { ...evidenceExport, safety: { ...evidenceExport.safety, authoritative: true } },
      artifacts,
    ),
  ).toBe(false);
  expect(
    validateSustainabilityEvidenceExport(
      { ...evidenceExport, exportFingerprint: '0'.repeat(64) },
      artifacts,
    ),
  ).toBe(false);
});

test('rejects deceptive export descriptors without evaluating getters', () => {
  const artifacts = fixture();
  const evidenceExport = createSustainabilityEvidenceExport(artifacts);
  let getterReads = 0;
  const deceptive = { ...evidenceExport };
  Object.defineProperty(deceptive, 'chainFingerprint', {
    enumerable: true,
    get() {
      getterReads += 1;
      return evidenceExport.chainFingerprint;
    },
  });

  expect(validateSustainabilityEvidenceExport(deceptive, artifacts)).toBe(false);
  expect(getterReads).toBe(0);
});
