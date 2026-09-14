import { expect, test } from '@jest/globals';
import {
  createSustainabilityReceipt,
  validateSustainabilityReceipt,
} from '../../src/sustainability/execution-receipt.js';

test('creates deterministic immutable sustainability evidence', () => {
  const workload = {
    name: 'scene-analysis',
    model: 'SOLVÆR',
    resources: { acceleratorCount: 2 },
  };
  const receipt = createSustainabilityReceipt({
    workload,
    durationMs: 1250,
    estimatedEnergyWh: 18.4,
    renewableRatio: 0.72,
  });
  const equivalent = createSustainabilityReceipt({
    renewableRatio: 0.72,
    estimatedEnergyWh: 18.4,
    durationMs: 1250,
    workload: {
      resources: { acceleratorCount: 2 },
      model: 'SOLVÆR',
      name: 'scene-analysis',
    },
  });

  expect(validateSustainabilityReceipt(receipt)).toBe(true);
  expect(receipt.receiptFingerprint).toBe(equivalent.receiptFingerprint);
  expect(Object.isFrozen(receipt)).toBe(true);
  expect(Object.isFrozen(receipt.workload)).toBe(true);
  expect(Object.isFrozen(receipt.workload.resources)).toBe(true);

  workload.resources.acceleratorCount = 99;
  expect(receipt.workload.resources.acceleratorCount).toBe(2);
});

test('rejects non-finite or out-of-range sustainability measurements', () => {
  expect(() =>
    createSustainabilityReceipt({
      workload: 'scene-analysis',
      durationMs: Number.NaN,
      estimatedEnergyWh: 1,
    }),
  ).toThrow(/durationMs/);
  expect(() =>
    createSustainabilityReceipt({
      workload: 'scene-analysis',
      durationMs: 1,
      estimatedEnergyWh: Number.POSITIVE_INFINITY,
    }),
  ).toThrow(/estimatedEnergyWh/);
  expect(() =>
    createSustainabilityReceipt({
      workload: 'scene-analysis',
      durationMs: 1,
      estimatedEnergyWh: 1,
      renewableRatio: 1.1,
    }),
  ).toThrow(/renewableRatio/);
});

test('rejects unsupported or circular workload evidence', () => {
  expect(() =>
    createSustainabilityReceipt({
      workload: { run: () => 'execute' },
      durationMs: 1,
      estimatedEnergyWh: 1,
    }),
  ).toThrow(/JSON-compatible evidence/);

  const workload = { name: 'cycle' };
  workload.self = workload;
  expect(() =>
    createSustainabilityReceipt({
      workload,
      durationMs: 1,
      estimatedEnergyWh: 1,
    }),
  ).toThrow(/circular references/);
});

test('fails closed when sustainability evidence is tampered', () => {
  const receipt = createSustainabilityReceipt({
    workload: { name: 'scene-analysis' },
    durationMs: 100,
    estimatedEnergyWh: 2.5,
    renewableRatio: 0.5,
  });

  expect(validateSustainabilityReceipt({ ...receipt, estimatedEnergyWh: 99 })).toBe(false);
  expect(
    validateSustainabilityReceipt({
      ...receipt,
      workload: { ...receipt.workload, name: 'changed' },
    }),
  ).toBe(false);
});
