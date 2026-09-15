import { createSustainabilityEvidenceBundle, validateSustainabilityEvidenceBundle } from '../../src/sustainability/evidence-bundle.js';
import { createSustainabilityEfficiencyObservation } from '../../src/sustainability/efficiency-observation.js';
import { createSustainabilityReceipt } from '../../src/sustainability/execution-receipt.js';

function receipt(overrides = {}) {
  return createSustainabilityReceipt({
    workload: { name: 'scene-analysis', model: 'SOLVÆR' },
    durationMs: 3_600_000,
    estimatedEnergyWh: 20,
    renewableRatio: 0.25,
    ...overrides,
  });
}

test('rejects an observation paired with a different valid receipt', () => {
  const source = receipt();
  const otherReceipt = receipt({ estimatedEnergyWh: 21 });
  const observation = createSustainabilityEfficiencyObservation(source);

  expect(() =>
    createSustainabilityEvidenceBundle({
      receipt: otherReceipt,
      metadata: { source: 'runtime' },
      efficiency: observation,
    }),
  ).toThrow(/must match bundled receipt/);
});

test('rejects a re-fingerprinted bundle whose observation lineage was substituted', () => {
  const source = receipt();
  const otherReceipt = receipt({ estimatedEnergyWh: 21 });
  const observation = createSustainabilityEfficiencyObservation(source);
  const otherObservation = createSustainabilityEfficiencyObservation(otherReceipt);
  const bundle = createSustainabilityEvidenceBundle({
    receipt: source,
    metadata: { source: 'runtime' },
    efficiency: observation,
  });

  const substituted = {
    ...bundle,
    efficiency: otherObservation,
  };
  expect(validateSustainabilityEvidenceBundle(substituted)).toBe(false);
});

test('keeps generic efficiency evidence backward compatible', () => {
  const bundle = createSustainabilityEvidenceBundle({
    receipt: { estimatedEnergyWh: 4 },
    metadata: { source: 'runtime' },
    efficiency: { energyPerSecondWh: 2 },
  });

  expect(validateSustainabilityEvidenceBundle(bundle)).toBe(true);
});
