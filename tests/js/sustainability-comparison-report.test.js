import { expect, test } from '@jest/globals';
import { createSustainabilityReceipt } from '../../src/sustainability/execution-receipt.js';
import { compareSustainabilityReceipts } from '../../src/sustainability/receipt-comparison.js';
import {
  createSustainabilityComparisonReport,
  validateSustainabilityComparisonReport,
} from '../../src/sustainability/comparison-report.js';

function receipt(overrides = {}) {
  return createSustainabilityReceipt({
    workload: { name: 'scene-analysis', model: 'SOLVÆR' },
    durationMs: 1000,
    estimatedEnergyWh: 20,
    renewableRatio: 0.5,
    ...overrides,
  });
}

test('projects validated comparison evidence into an operator-review report without selection authority', () => {
  const comparison = compareSustainabilityReceipts({
    baseline: receipt(),
    candidate: receipt({ durationMs: 900, estimatedEnergyWh: 16, renewableRatio: 0.75 }),
  });
  const report = createSustainabilityComparisonReport(comparison);

  expect(validateSustainabilityComparisonReport(report, comparison)).toBe(true);
  expect(report.comparability).toBe('same-workload-evidence');
  expect(report.contextRequired).toBe(false);
  expect(report.interpretation).toBe('operator-review-required');
  expect(report.observations).toEqual([
    {
      metric: 'duration',
      delta: -100,
      direction: 'lower',
      unit: 'ms',
      qualification: 'measured-runtime',
    },
    {
      metric: 'estimated-energy',
      delta: -4,
      direction: 'lower',
      unit: 'Wh',
      qualification: 'estimated',
    },
    {
      metric: 'renewable-ratio',
      delta: 0.25,
      direction: 'higher',
      unit: 'ratio',
      qualification: 'reported-share',
    },
  ]);
  expect(report.safety).toEqual({
    advisoryOnly: true,
    authoritative: false,
    selectsWinner: false,
    recommendsAction: false,
    schedulesWorkloads: false,
    deploysWorkloads: false,
    physicalActuation: false,
  });
  expect(report).not.toHaveProperty('winner');
  expect(report).not.toHaveProperty('preferred');
  expect(report).not.toHaveProperty('recommendation');
});

test('marks different workload evidence as requiring context instead of presenting it as equivalent', () => {
  const comparison = compareSustainabilityReceipts({
    baseline: receipt(),
    candidate: receipt({ workload: { name: 'different-workload', model: 'SOLVÆR' } }),
  });
  const report = createSustainabilityComparisonReport(comparison);

  expect(report.comparability).toBe('different-workload-evidence');
  expect(report.contextRequired).toBe(true);
  expect(validateSustainabilityComparisonReport(report, comparison)).toBe(true);
});

test('report identity is deterministic and recursively immutable', () => {
  const comparison = compareSustainabilityReceipts({
    baseline: receipt(),
    candidate: receipt({ estimatedEnergyWh: 18 }),
  });
  const first = createSustainabilityComparisonReport(comparison);
  const second = createSustainabilityComparisonReport(comparison);

  expect(first.reportFingerprint).toBe(second.reportFingerprint);
  expect(Object.isFrozen(first)).toBe(true);
  expect(Object.isFrozen(first.observations)).toBe(true);
  expect(Object.isFrozen(first.observations[0])).toBe(true);
  expect(Object.isFrozen(first.safety)).toBe(true);
});

test('tampered report metrics or authority fail validation', () => {
  const comparison = compareSustainabilityReceipts({
    baseline: receipt(),
    candidate: receipt({ estimatedEnergyWh: 18 }),
  });
  const report = createSustainabilityComparisonReport(comparison);

  expect(
    validateSustainabilityComparisonReport(
      {
        ...report,
        observations: report.observations.map((observation, index) =>
          index === 1 ? { ...observation, delta: 999 } : observation,
        ),
      },
      comparison,
    ),
  ).toBe(false);
  expect(
    validateSustainabilityComparisonReport(
      { ...report, safety: { ...report.safety, recommendsAction: true } },
      comparison,
    ),
  ).toBe(false);
});
