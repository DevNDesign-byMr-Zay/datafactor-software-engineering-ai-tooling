import { expect, test } from '@jest/globals';
import { validateEnergyReceipt } from '../../src/sustainability/energy-receipt-validator.js';

test('validates and freezes a finite energy receipt', () => {
  const validated = validateEnergyReceipt({
    estimatedEnergyWh: 12.5,
    renewableRatio: 0.75,
  });

  expect(validated).toEqual({
    estimatedEnergyWh: 12.5,
    renewableRatio: 0.75,
    validated: true,
  });
  expect(Object.isFrozen(validated)).toBe(true);
});

test('rejects malformed energy estimates', () => {
  for (const estimatedEnergyWh of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    expect(() => validateEnergyReceipt({ estimatedEnergyWh })).toThrow(/Invalid energy estimate/);
  }
});

test('rejects non-finite and out-of-range renewable ratios', () => {
  for (const renewableRatio of [-0.1, 1.1, Number.NaN, Number.POSITIVE_INFINITY]) {
    expect(() => validateEnergyReceipt({ estimatedEnergyWh: 1, renewableRatio })).toThrow(
      /Invalid renewable ratio/,
    );
  }
});

test('allows an omitted renewable ratio', () => {
  expect(validateEnergyReceipt({ estimatedEnergyWh: 1 })).toEqual({
    estimatedEnergyWh: 1,
    validated: true,
  });
});
