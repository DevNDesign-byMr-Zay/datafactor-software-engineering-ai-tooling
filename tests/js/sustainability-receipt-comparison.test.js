import { createHash } from 'node:crypto';
import { expect, test } from '@jest/globals';
import { createSustainabilityReceipt } from '../../src/sustainability/execution-receipt.js';
import {
  compareSustainabilityReceipts,
  validateSustainabilityComparison,
} from '../../src/sustainability/receipt-comparison.js';

function receipt(overrides = {}) {
  return createSustainabilityReceipt({
    workload: { name: 'scene-analysis', model: 'SOLVÆR' },
    durationMs: 1000,
    estimatedEnergyWh: 20,
    renewableRatio: 0.5,
    ...overrides,
  });
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function resign(comparison) {
  const body = Object.fromEntries(
    Object.entries(comparison).filter(([key]) => key !== 'comparisonFingerprint'),
  );
  return {
    ...comparison,
    comparisonFingerprint: createHash('sha256')
      .update(JSON.stringify(canonical(body)), 'utf8')
      .digest('hex'),
  };
}

test('compares validated sustainability receipts without selecting a winner', () => {
  const baseline = receipt();
  const candidate = receipt({
    durationMs: 900,
    estimatedEnergyWh: 16,
    renewableRatio: 0.75,
  });

  const comparison = compareSustainabilityReceipts({ baseline, candidate });

  expect(validateSustainabilityComparison(comparison)).toBe(true);
  expect(comparison.sameWorkloadEvidence).toBe(true);
  expect(comparison.metrics).toEqual({
    durationDeltaMs: -100,
    durationDirection: 'lower',
    estimatedEnergyDeltaWh: -4,
    estimatedEnergyDirection: 'lower',
    renewableRatioDelta: 0.25,
    renewableRatioDirection: 'higher',
  });
  expect(comparison.interpretation).toBe('observational-only');
  expect(comparison.safety).toEqual({
    advisoryOnly: true,
    authoritative: false,
    schedulesWorkloads: false,
    deploysWorkloads: false,
    physicalActuation: false,
  });
  expect(comparison).not.toHaveProperty('preferred');
  expect(comparison).not.toHaveProperty('winner');
});

test('comparison identity is deterministic for the same validated receipts', () => {
  const baseline = receipt();
  const candidate = receipt({ estimatedEnergyWh: 19 });

  const first = compareSustainabilityReceipts({ baseline, candidate });
  const second = compareSustainabilityReceipts({ baseline, candidate });

  expect(first.comparisonFingerprint).toBe(second.comparisonFingerprint);
  expect(Object.isFrozen(first)).toBe(true);
  expect(Object.isFrozen(first.metrics)).toBe(true);
  expect(Object.isFrozen(first.safety)).toBe(true);
});

test('comparison exposes workload-evidence differences without treating them as equivalent', () => {
  const baseline = receipt();
  const candidate = receipt({
    workload: { name: 'different-workload', model: 'SOLVÆR' },
  });

  const comparison = compareSustainabilityReceipts({ baseline, candidate });
  expect(comparison.sameWorkloadEvidence).toBe(false);
  expect(validateSustainabilityComparison(comparison)).toBe(true);
});

test('rejects tampered input receipts and tampered comparison authority', () => {
  const baseline = receipt();
  const candidate = receipt({ estimatedEnergyWh: 18 });

  expect(() =>
    compareSustainabilityReceipts({
      baseline: { ...baseline, estimatedEnergyWh: 999 },
      candidate,
    }),
  ).toThrow(/baseline sustainability receipt is invalid/);

  const comparison = compareSustainabilityReceipts({ baseline, candidate });
  expect(
    validateSustainabilityComparison({
      ...comparison,
      safety: { ...comparison.safety, schedulesWorkloads: true },
    }),
  ).toBe(false);
  expect(
    validateSustainabilityComparison({
      ...comparison,
      metrics: { ...comparison.metrics, estimatedEnergyDeltaWh: 99 },
    }),
  ).toBe(false);
});

test('fails closed on structurally malformed comparison records even when re-signed', () => {
  const comparison = compareSustainabilityReceipts({
    baseline: receipt(),
    candidate: receipt({ estimatedEnergyWh: 18 }),
  });

  expect(validateSustainabilityComparison(resign({ ...comparison, sameWorkloadEvidence: 'yes' }))).toBe(false);
  expect(
    validateSustainabilityComparison(
      resign({
        ...comparison,
        metrics: { ...comparison.metrics, estimatedEnergyDirection: 'unchanged' },
      }),
    ),
  ).toBe(false);
  expect(validateSustainabilityComparison(resign({ ...comparison, preferred: 'candidate' }))).toBe(false);
});
