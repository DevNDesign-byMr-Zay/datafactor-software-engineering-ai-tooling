import { expect, test } from '@jest/globals';
import { createSustainabilityReceipt } from '../../src/sustainability/execution-receipt.js';
import {
  createSustainabilityEfficiencyObservation,
  validateSustainabilityEfficiencyObservation,
} from '../../src/sustainability/efficiency-observation.js';

function receipt(overrides = {}) {
  return createSustainabilityReceipt({
    workload: { name: 'scene-analysis', model: 'SOLVÆR' },
    durationMs: 3_600_000,
    estimatedEnergyWh: 20,
    renewableRatio: 0.25,
    ...overrides,
  });
}

test('derives correctly qualified power and estimated non-renewable-share observations', () => {
  const source = receipt();
  const observation = createSustainabilityEfficiencyObservation(source);

  expect(observation.sourceReceiptFingerprint).toBe(source.receiptFingerprint);
  expect(observation.metrics).toEqual({
    averagePower: {
      value: 20,
      unit: 'W',
      qualification: 'derived-from-estimated-energy-and-measured-duration',
    },
    estimatedNonRenewableShareEnergy: {
      value: 15,
      unit: 'Wh',
      qualification: 'derived-from-estimated-energy-and-reported-renewable-ratio',
    },
  });
  expect(observation.interpretation).toBe('observational-only');
  expect(observation.safety).toEqual({
    advisoryOnly: true,
    authoritative: false,
    ranksWorkloads: false,
    recommendsAction: false,
    schedulesWorkloads: false,
    deploysWorkloads: false,
    physicalActuation: false,
  });
  expect(validateSustainabilityEfficiencyObservation(observation, source)).toBe(true);
});

test('zero-duration zero-energy evidence has a defined zero average power observation', () => {
  const source = receipt({ durationMs: 0, estimatedEnergyWh: 0 });
  const observation = createSustainabilityEfficiencyObservation(source);

  expect(observation.metrics.averagePower.value).toBe(0);
  expect(observation.metrics.estimatedNonRenewableShareEnergy.value).toBe(0);
  expect(validateSustainabilityEfficiencyObservation(observation, source)).toBe(true);
});

test('rejects impossible positive-energy zero-duration derivation', () => {
  expect(() =>
    createSustainabilityEfficiencyObservation(receipt({ durationMs: 0, estimatedEnergyWh: 1 })),
  ).toThrow(/average power cannot be derived/);
});

test('rejects tampered receipts and observations even when values look plausible', () => {
  const source = receipt();
  const observation = createSustainabilityEfficiencyObservation(source);

  expect(() =>
    createSustainabilityEfficiencyObservation({
      ...source,
      estimatedEnergyWh: 10,
    }),
  ).toThrow(/validated sustainability receipt is required/);

  expect(
    validateSustainabilityEfficiencyObservation(
      {
        ...observation,
        metrics: {
          ...observation.metrics,
          averagePower: { ...observation.metrics.averagePower, value: 999 },
        },
      },
      source,
    ),
  ).toBe(false);
  expect(
    validateSustainabilityEfficiencyObservation(
      {
        ...observation,
        safety: { ...observation.safety, recommendsAction: true },
      },
      source,
    ),
  ).toBe(false);
});

test('observation identity is deterministic and recursively immutable', () => {
  const source = receipt();
  const first = createSustainabilityEfficiencyObservation(source);
  const second = createSustainabilityEfficiencyObservation(source);

  expect(first.observationFingerprint).toBe(second.observationFingerprint);
  expect(Object.isFrozen(first)).toBe(true);
  expect(Object.isFrozen(first.metrics)).toBe(true);
  expect(Object.isFrozen(first.metrics.averagePower)).toBe(true);
  expect(Object.isFrozen(first.safety)).toBe(true);
  expect(first).not.toHaveProperty('score');
  expect(first).not.toHaveProperty('winner');
  expect(first).not.toHaveProperty('preferred');
});

test('rejects hidden, symbolic, accessor-backed, and malformed observation evidence', () => {
  const source = receipt();
  const observation = createSustainabilityEfficiencyObservation(source);
  let getterReads = 0;

  const accessor = { ...observation };
  Object.defineProperty(accessor, 'observationFingerprint', {
    enumerable: true,
    get() {
      getterReads += 1;
      return observation.observationFingerprint;
    },
  });
  expect(validateSustainabilityEfficiencyObservation(accessor, source)).toBe(false);
  expect(getterReads).toBe(0);

  const hidden = { ...observation };
  Object.defineProperty(hidden, 'hidden', { enumerable: false, value: true });
  expect(validateSustainabilityEfficiencyObservation(hidden, source)).toBe(false);

  const symbolic = { ...observation };
  symbolic[Symbol('hidden')] = true;
  expect(validateSustainabilityEfficiencyObservation(symbolic, source)).toBe(false);

  const metrics = { ...observation.metrics };
  Object.defineProperty(metrics, 'averagePower', {
    enumerable: true,
    get() {
      getterReads += 1;
      return observation.metrics.averagePower;
    },
  });
  expect(validateSustainabilityEfficiencyObservation({ ...observation, metrics }, source)).toBe(
    false,
  );
  expect(getterReads).toBe(0);

  expect(
    validateSustainabilityEfficiencyObservation(
      { ...observation, metrics: { ...observation.metrics, extra: true } },
      source,
    ),
  ).toBe(false);
  expect(
    validateSustainabilityEfficiencyObservation(
      {
        ...observation,
        metrics: {
          ...observation.metrics,
          averagePower: { ...observation.metrics.averagePower, value: Number.POSITIVE_INFINITY },
        },
      },
      source,
    ),
  ).toBe(false);
});
