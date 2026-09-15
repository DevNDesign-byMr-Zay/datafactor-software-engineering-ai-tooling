import { calculateSustainabilityEfficiency } from './efficiency-score.js';
import {
  createSustainabilityEvidenceBundle,
  validateSustainabilityEvidenceBundle,
} from './evidence-bundle.js';
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
    expect(getSustainabilityReceiptStatus({ estimatedEnergyWh: 4, renewableRatio: 1 })).toBe(
      'renewable',
    );
    expect(getSustainabilityReceiptStatus({ estimatedEnergyWh: 4, renewableRatio: 0.25 })).toBe(
      'partially-renewable',
    );
    expect(getSustainabilityReceiptStatus({ estimatedEnergyWh: 4 })).toBe('grid-only');
  });

  test('snapshots complete evidence bundles before sealing them', () => {
    const receipt = { estimatedEnergyWh: 4, runtime: { id: 'run-1' } };
    const metadata = { source: 'runtime', tags: ['reviewed'] };
    const efficiency = { energyPerSecondWh: 2 };
    const bundle = createSustainabilityEvidenceBundle({ receipt, metadata, efficiency });

    expect(bundle.version).toBe(1);
    expect(bundle.receipt).toEqual(receipt);
    expect(bundle.receipt).not.toBe(receipt);
    expect(Object.isFrozen(bundle.receipt.runtime)).toBe(true);
    expect(Object.isFrozen(bundle.metadata.tags)).toBe(true);
    expect(bundle.bundleFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(validateSustainabilityEvidenceBundle(bundle)).toBe(true);

    receipt.runtime.id = 'mutated';
    metadata.tags.push('late-change');
    expect(bundle.receipt.runtime.id).toBe('run-1');
    expect(bundle.metadata.tags).toEqual(['reviewed']);
    expect(validateSustainabilityEvidenceBundle(bundle)).toBe(true);
  });

  test('fingerprints equivalent evidence deterministically and rejects tampering', () => {
    const input = {
      receipt: { estimatedEnergyWh: 4, runtime: { id: 'run-1' } },
      metadata: { source: 'runtime', tags: ['reviewed'] },
      efficiency: { energyPerSecondWh: 2 },
    };
    const first = createSustainabilityEvidenceBundle(input);
    const second = createSustainabilityEvidenceBundle({
      efficiency: { ...input.efficiency },
      metadata: { tags: [...input.metadata.tags], source: input.metadata.source },
      receipt: { runtime: { ...input.receipt.runtime }, estimatedEnergyWh: 4 },
    });

    expect(first.bundleFingerprint).toBe(second.bundleFingerprint);
    expect(
      validateSustainabilityEvidenceBundle({
        ...first,
        efficiency: { ...first.efficiency, energyPerSecondWh: 99 },
      }),
    ).toBe(false);
    expect(validateSustainabilityEvidenceBundle({ ...first, unexpected: true })).toBe(false);
  });

  test('preserves repeated evidence references without treating them as cycles', () => {
    const shared = { id: 'shared-runtime' };
    const bundle = createSustainabilityEvidenceBundle({
      receipt: { first: shared, second: shared },
      metadata: { source: 'runtime' },
      efficiency: { energyPerSecondWh: 2 },
    });

    expect(bundle.receipt.first).toEqual(shared);
    expect(bundle.receipt.second).toEqual(shared);
    expect(bundle.receipt.first).not.toBe(shared);
    expect(bundle.receipt.second).not.toBe(shared);
  });

  test('fails closed on incomplete or non-serializable evidence', () => {
    const receipt = { estimatedEnergyWh: 4 };
    const metadata = { source: 'runtime' };
    const efficiency = { energyPerSecondWh: 2 };

    expect(() => createSustainabilityEvidenceBundle({ receipt, metadata })).toThrow();
    expect(() =>
      createSustainabilityEvidenceBundle({
        receipt: { ...receipt, bad: () => true },
        metadata,
        efficiency,
      }),
    ).toThrow(/JSON-compatible evidence/);

    const circular = { ...receipt };
    circular.self = circular;
    expect(() =>
      createSustainabilityEvidenceBundle({
        receipt: circular,
        metadata,
        efficiency,
      }),
    ).toThrow(/circular references/);
  });
});
