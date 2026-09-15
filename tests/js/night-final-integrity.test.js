import { expect, test } from '@jest/globals';
import { createSustainabilityReceipt } from '../../src/sustainability/execution-receipt.js';
import {
  compareSustainabilityReceipts,
  validateSustainabilityComparison,
} from '../../src/sustainability/receipt-comparison.js';

test('comparison remains observational when input receipts are independently valid', () => {
  const baseline = createSustainabilityReceipt({
    workload: { name: 'scene-analysis', model: 'SOLVÆR' },
    durationMs: 1000,
    estimatedEnergyWh: 20,
    renewableRatio: 0.5,
  });
  const candidate = createSustainabilityReceipt({
    workload: { name: 'scene-analysis', model: 'SOLVÆR' },
    durationMs: 900,
    estimatedEnergyWh: 18,
    renewableRatio: 0.6,
  });

  const comparison = compareSustainabilityReceipts({ baseline, candidate });

  expect(validateSustainabilityComparison(comparison)).toBe(true);
  expect(comparison.interpretation).toBe('observational-only');
  expect(comparison.safety).toEqual({
    advisoryOnly: true,
    authoritative: false,
    schedulesWorkloads: false,
    deploysWorkloads: false,
    physicalActuation: false,
  });
  expect(comparison).not.toHaveProperty('winner');
  expect(comparison).not.toHaveProperty('preferred');
});

test('comparison validator rejects cross-layer fingerprint substitution', () => {
  const baseline = createSustainabilityReceipt({
    workload: { name: 'scene-analysis', model: 'SOLVÆR' },
    durationMs: 1000,
    estimatedEnergyWh: 20,
    renewableRatio: 0.5,
  });
  const candidate = createSustainabilityReceipt({
    workload: { name: 'scene-analysis', model: 'SOLVÆR' },
    durationMs: 900,
    estimatedEnergyWh: 18,
    renewableRatio: 0.6,
  });
  const comparison = compareSustainabilityReceipts({ baseline, candidate });

  expect(
    validateSustainabilityComparison({
      ...comparison,
      baselineFingerprint: candidate.receiptFingerprint,
    }),
  ).toBe(false);
});
