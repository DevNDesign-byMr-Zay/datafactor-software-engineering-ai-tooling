import { calculateSustainabilityEfficiency } from './efficiency-score.js';
import { createSustainabilityEvidenceBundle } from './evidence-bundle.js';
import { getSustainabilityReceiptStatus } from './receipt-status.js';


describe('sustainability contracts', () => {
  test('calculates energy efficiency without mutation', () => {
    const result = calculateSustainabilityEfficiency({
      durationMs: 2000,
      estimatedEnergyWh: 4,
      renewableRatio: 0.5,
    });

    expect(result.energyPerSecondWh).toBe(2);
    expect(result.renewableAdjustedEnergyWh).toBe(2);
  });

  test('classifies renewable receipt state', () => {
    expect(getSustainabilityReceiptStatus({ estimatedEnergyWh: 0 })).toBe('no-energy-estimate');
    expect(getSustainabilityReceiptStatus({ estimatedEnergyWh: 4, renewableRatio: 1 })).toBe('renewable');
    expect(getSustainabilityReceiptStatus({ estimatedEnergyWh: 4, renewableRatio: 0.25 })).toBe('partially-renewable');
    expect(getSustainabilityReceiptStatus({ estimatedEnergyWh: 4 })).toBe('grid-only');
  });

  test('requires complete evidence bundles', () => {
    const receipt = { estimatedEnergyWh: 4 };
    const metadata = { source: 'runtime' };
    const efficiency = { energyPerSecondWh: 2 };
    const bundle = createSustainabilityEvidenceBundle({ receipt, metadata, efficiency });

    expect(bundle.version).toBe(1);
    expect(bundle.receipt).toBe(receipt);
    expect(() => createSustainabilityEvidenceBundle({ receipt, metadata })).toThrow();
  });
});
