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

test('rejects deceptive workload evidence without evaluating getters', () => {
  let getterReads = 0;
  const accessorWorkload = { name: 'scene-analysis' };
  Object.defineProperty(accessorWorkload, 'dynamic', {
    enumerable: true,
    get() {
      getterReads += 1;
      return 'unsafe';
    },
  });

  expect(() =>
    createSustainabilityReceipt({
      workload: accessorWorkload,
      durationMs: 100,
      estimatedEnergyWh: 2.5,
      renewableRatio: 0.5,
    }),
  ).toThrow(/must not use accessors/);
  expect(getterReads).toBe(0);

  const hiddenWorkload = { name: 'scene-analysis' };
  Object.defineProperty(hiddenWorkload, 'secret', { value: true, enumerable: false });
  expect(() =>
    createSustainabilityReceipt({
      workload: hiddenWorkload,
      durationMs: 100,
      estimatedEnergyWh: 2.5,
      renewableRatio: 0.5,
    }),
  ).toThrow(/enumerable evidence/);

  const symbolicWorkload = { name: 'scene-analysis' };
  symbolicWorkload[Symbol('hidden')] = true;
  expect(() =>
    createSustainabilityReceipt({
      workload: symbolicWorkload,
      durationMs: 100,
      estimatedEnergyWh: 2.5,
      renewableRatio: 0.5,
    }),
  ).toThrow(/symbol properties/);
});

test('receipt validator rejects deceptive descriptors without evaluating getters', () => {
  const receipt = createSustainabilityReceipt({
    workload: { name: 'scene-analysis' },
    durationMs: 100,
    estimatedEnergyWh: 2.5,
    renewableRatio: 0.5,
  });

  let getterReads = 0;
  const accessorReceipt = { ...receipt };
  Object.defineProperty(accessorReceipt, 'receiptFingerprint', {
    enumerable: true,
    get() {
      getterReads += 1;
      return receipt.receiptFingerprint;
    },
  });
  expect(validateSustainabilityReceipt(accessorReceipt)).toBe(false);
  expect(getterReads).toBe(0);

  const extraReceipt = { ...receipt, unexpected: true };
  expect(validateSustainabilityReceipt(extraReceipt)).toBe(false);

  const symbolicReceipt = { ...receipt };
  symbolicReceipt[Symbol('hidden')] = true;
  expect(validateSustainabilityReceipt(symbolicReceipt)).toBe(false);

  const nullPrototypeReceipt = Object.assign(Object.create(null), receipt);
  expect(validateSustainabilityReceipt(nullPrototypeReceipt)).toBe(false);
});
