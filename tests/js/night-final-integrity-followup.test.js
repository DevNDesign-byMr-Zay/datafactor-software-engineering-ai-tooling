import { expect, test } from '@jest/globals';
import { createSustainabilityReceipt } from '../../src/sustainability/execution-receipt.js';
import { compareSustainabilityReceipts, validateSustainabilityComparison } from '../../src/sustainability/receipt-comparison.js';

test('comparison validator rejects authority added through a fresh object', () => {
  const receipt = (energy) => createSustainabilityReceipt({ workload: { name: 'scene-analysis', model: 'SOLVÆR' }, durationMs: 1000, estimatedEnergyWh: energy, renewableRatio: 0.5 });
  const comparison = compareSustainabilityReceipts({ baseline: receipt(20), candidate: receipt(18) });
  expect(validateSustainabilityComparison({ ...comparison, safety: { advisoryOnly: true, authoritative: true, schedulesWorkloads: false, deploysWorkloads: false, physicalActuation: false } })).toBe(false);
});
