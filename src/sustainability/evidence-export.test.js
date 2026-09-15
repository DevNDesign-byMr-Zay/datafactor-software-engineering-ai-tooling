import {
  createSustainabilityEfficiencyObservation,
  validateSustainabilityEfficiencyObservation,
} from './efficiency-observation.js';
import {
  createSustainabilityEvidenceBundle,
  validateSustainabilityEvidenceBundle,
} from './evidence-bundle.js';
import {
  createSustainabilityEvidenceChain,
  validateSustainabilityEvidenceChain,
} from './evidence-chain.js';
import {
  createSustainabilityEvidenceExport,
  validateSustainabilityEvidenceExport,
} from './evidence-export.js';
import { createSustainabilityReceipt, validateSustainabilityReceipt } from './execution-receipt.js';

function createArtifacts(overrides = {}) {
  const receipt = createSustainabilityReceipt({
    workload: { name: 'export-test', runId: 'run-1' },
    durationMs: 3_600_000,
    estimatedEnergyWh: 20,
    renewableRatio: 0.25,
    ...overrides.receipt,
  });
  const observation = createSustainabilityEfficiencyObservation(receipt);
  const metadata = {
    energyWh: receipt.estimatedEnergyWh,
    renewableRatio: receipt.renewableRatio,
    source: 'test',
  };
  const bundle = createSustainabilityEvidenceBundle({
    receipt,
    metadata,
    efficiency: {
      energyPerSecondWh: receipt.estimatedEnergyWh / (receipt.durationMs / 1000),
    },
  });
  const artifacts = { receipt, observation, bundle };
  const chain = createSustainabilityEvidenceChain(artifacts);
  const evidenceExport = createSustainabilityEvidenceExport({ ...artifacts, chain });

  return { ...artifacts, chain, evidenceExport };
}

describe('sustainability evidence export boundary', () => {
  test('exports only from a validated sealed evidence chain', () => {
    const artifacts = createArtifacts();

    expect(validateSustainabilityReceipt(artifacts.receipt)).toBe(true);
    expect(validateSustainabilityEfficiencyObservation(artifacts.observation, artifacts.receipt)).toBe(
      true,
    );
    expect(validateSustainabilityEvidenceBundle(artifacts.bundle)).toBe(true);
    expect(validateSustainabilityEvidenceChain(artifacts.chain, artifacts)).toBe(true);
    expect(validateSustainabilityEvidenceExport(artifacts.evidenceExport, artifacts)).toBe(true);
    expect(artifacts.evidenceExport.chainFingerprint).toBe(artifacts.chain.chainFingerprint);
  });

  test('rejects a valid export when a different valid receipt is substituted', () => {
    const original = createArtifacts();
    const substitute = createArtifacts({
      receipt: { workload: { name: 'export-test', runId: 'run-2' } },
    });

    expect(validateSustainabilityReceipt(substitute.receipt)).toBe(true);
    expect(validateSustainabilityEvidenceExport(original.evidenceExport, substitute)).toBe(false);
  });

  test('rejects a valid export when a different valid observation is substituted', () => {
    const original = createArtifacts();
    const substitute = createArtifacts({
      receipt: { workload: { name: 'export-test', runId: 'run-2' } },
    });

    expect(validateSustainabilityEfficiencyObservation(substitute.observation, substitute.receipt)).toBe(
      true,
    );
    expect(validateSustainabilityEvidenceExport(original.evidenceExport, {
      ...original,
      observation: substitute.observation,
    })).toBe(false);
  });

  test('rejects tampered exported metrics and safety declarations', () => {
    const artifacts = createArtifacts();

    expect(
      validateSustainabilityEvidenceExport(
        { ...artifacts.evidenceExport, estimatedEnergyWh: 99 },
        artifacts,
      ),
    ).toBe(false);

    expect(
      validateSustainabilityEvidenceExport(
        {
          ...artifacts.evidenceExport,
          safety: { ...artifacts.evidenceExport.safety, authoritative: true },
        },
        artifacts,
      ),
    ).toBe(false);
  });

  test('fails closed on deceptive export accessors and extra fields', () => {
    const artifacts = createArtifacts();
    let getterReads = 0;
    const accessorExport = { ...artifacts.evidenceExport };
    Object.defineProperty(accessorExport, 'exportFingerprint', {
      enumerable: true,
      get() {
        getterReads += 1;
        return artifacts.evidenceExport.exportFingerprint;
      },
    });

    expect(validateSustainabilityEvidenceExport(accessorExport, artifacts)).toBe(false);
    expect(getterReads).toBe(0);
    expect(
      validateSustainabilityEvidenceExport(
        { ...artifacts.evidenceExport, unexpected: true },
        artifacts,
      ),
    ).toBe(false);
  });
});
