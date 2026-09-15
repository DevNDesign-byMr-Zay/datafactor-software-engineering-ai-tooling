import { expect, test } from '@jest/globals';
import { createSustainabilityReceipt } from '../../src/sustainability/execution-receipt.js';
import { createSustainabilityEfficiencyObservation } from '../../src/sustainability/efficiency-observation.js';
import { calculateSustainabilityEfficiency } from '../../src/sustainability/efficiency-score.js';
import { createSustainabilityMetadata } from '../../src/sustainability/sustainability-metadata.js';
import { createSustainabilityEvidenceBundle } from '../../src/sustainability/evidence-bundle.js';
import {
  createSustainabilityEvidenceChain,
  validateSustainabilityEvidenceChain,
} from '../../src/sustainability/evidence-chain.js';

function fixture(overrides = {}) {
  const receipt = createSustainabilityReceipt({
    workload: { name: 'scene-analysis', model: 'SOLVÆR' },
    durationMs: 2_000,
    estimatedEnergyWh: 4,
    renewableRatio: 0.5,
    ...overrides,
  });
  const observation = createSustainabilityEfficiencyObservation(receipt);
  const metadata = createSustainabilityMetadata({
    energyWh: receipt.estimatedEnergyWh,
    renewableRatio: receipt.renewableRatio,
    source: 'chain-test',
  });
  const efficiency = calculateSustainabilityEfficiency({
    durationMs: receipt.durationMs,
    estimatedEnergyWh: receipt.estimatedEnergyWh,
    renewableRatio: receipt.renewableRatio,
  });
  const bundle = createSustainabilityEvidenceBundle({ receipt, metadata, efficiency });
  return { receipt, observation, bundle };
}

test('creates deterministic immutable lineage across receipt, observation, and bundle', () => {
  const artifacts = fixture();
  const first = createSustainabilityEvidenceChain(artifacts);
  const second = createSustainabilityEvidenceChain(artifacts);

  expect(first.chainFingerprint).toMatch(/^[a-f0-9]{64}$/);
  expect(first.chainFingerprint).toBe(second.chainFingerprint);
  expect(first.receiptFingerprint).toBe(artifacts.receipt.receiptFingerprint);
  expect(first.observationFingerprint).toBe(artifacts.observation.observationFingerprint);
  expect(first.bundleFingerprint).toBe(artifacts.bundle.bundleFingerprint);
  expect(first.safety).toEqual({
    advisoryOnly: true,
    authoritative: false,
    schedulesWorkloads: false,
    deploysWorkloads: false,
    physicalActuation: false,
  });
  expect(Object.isFrozen(first)).toBe(true);
  expect(Object.isFrozen(first.safety)).toBe(true);
  expect(validateSustainabilityEvidenceChain(first, artifacts)).toBe(true);
});

test('rejects cross-artifact substitution even when each artifact is independently valid', () => {
  const artifacts = fixture();
  const chain = createSustainabilityEvidenceChain(artifacts);
  const alternate = fixture({ estimatedEnergyWh: 6 });

  expect(
    validateSustainabilityEvidenceChain(chain, {
      receipt: artifacts.receipt,
      observation: artifacts.observation,
      bundle: alternate.bundle,
    }),
  ).toBe(false);
  expect(
    validateSustainabilityEvidenceChain(chain, {
      receipt: alternate.receipt,
      observation: alternate.observation,
      bundle: alternate.bundle,
    }),
  ).toBe(false);
});

test('rejects tampered authority, lineage fingerprints, and extra fields', () => {
  const artifacts = fixture();
  const chain = createSustainabilityEvidenceChain(artifacts);

  expect(
    validateSustainabilityEvidenceChain(
      { ...chain, safety: { ...chain.safety, authoritative: true } },
      artifacts,
    ),
  ).toBe(false);
  expect(
    validateSustainabilityEvidenceChain(
      { ...chain, observationFingerprint: 'f'.repeat(64) },
      artifacts,
    ),
  ).toBe(false);
  expect(validateSustainabilityEvidenceChain({ ...chain, extra: true }, artifacts)).toBe(false);
});

test('rejects accessor-backed chain evidence without evaluating getters', () => {
  const artifacts = fixture();
  const chain = createSustainabilityEvidenceChain(artifacts);
  let getterReads = 0;
  const deceptive = { ...chain };
  Object.defineProperty(deceptive, 'chainFingerprint', {
    enumerable: true,
    get() {
      getterReads += 1;
      return chain.chainFingerprint;
    },
  });

  expect(validateSustainabilityEvidenceChain(deceptive, artifacts)).toBe(false);
  expect(getterReads).toBe(0);
});
