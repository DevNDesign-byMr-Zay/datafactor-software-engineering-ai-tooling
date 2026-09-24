import { describe, expect, test } from '@jest/globals';

import {
  createSustainabilityEvidencePackage,
  createSustainabilityEvidencePackageFromExecution,
  validateSustainabilityEvidencePackage,
} from '../../src/sustainability/evidence-package.js';

function executionInput() {
  return {
    workload: { name: 'package-edge-test', runId: 'run-edge-contract' },
    durationMs: 60_000,
    estimatedEnergyWh: 4,
    renewableRatio: 0.75,
    source: 'edge-contract-test',
  };
}

describe('sustainability evidence package defensive creation contract', () => {
  test('builds a verifiable package from one execution snapshot', () => {
    const evidencePackage = createSustainabilityEvidencePackageFromExecution(executionInput());
    expect(validateSustainabilityEvidencePackage(evidencePackage)).toBe(true);
    expect(evidencePackage.receipt.renewableRatio).toBe(0.75);
  });

  test('rejects non-object and incomplete execution inputs', () => {
    expect(() => createSustainabilityEvidencePackageFromExecution(null)).toThrow(/plain object/);
    expect(() => createSustainabilityEvidencePackageFromExecution([])).toThrow(/plain object/);
    expect(() =>
      createSustainabilityEvidencePackageFromExecution({
        workload: { name: 'missing-duration' },
        estimatedEnergyWh: 1,
      }),
    ).toThrow(/missing required field: durationMs/);
  });

  test('rejects hidden and unsupported execution fields before package construction', () => {
    const hidden = executionInput();
    Object.defineProperty(hidden, 'durationMs', { enumerable: false, value: hidden.durationMs });
    expect(() => createSustainabilityEvidencePackageFromExecution(hidden)).toThrow(
      /durationMs must be enumerable evidence/,
    );
    expect(() =>
      createSustainabilityEvidencePackageFromExecution({ ...executionInput(), deployNow: true }),
    ).toThrow(/unsupported field: deployNow/);
  });

  test('rejects an invalid lineage artifact even when the remaining artifacts are valid', () => {
    const valid = createSustainabilityEvidencePackageFromExecution(executionInput());
    expect(() =>
      createSustainabilityEvidencePackage({
        receipt: {},
        observation: valid.observation,
        bundle: valid.bundle,
        chain: valid.chain,
        evidenceExport: valid.evidenceExport,
      }),
    ).toThrow(/validated sustainability receipt is required/);
  });
});
