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
import {
  createSustainabilityEvidencePackage,
  validateSustainabilityEvidencePackage,
} from './evidence-package.js';
import { createSustainabilityReceipt, validateSustainabilityReceipt } from './execution-receipt.js';

function createArtifacts(runId = 'run-package-1') {
  const receipt = createSustainabilityReceipt({
    workload: { name: 'package-test', runId },
    durationMs: 1_800_000,
    estimatedEnergyWh: 12,
    renewableRatio: 0.5,
  });
  const observation = createSustainabilityEfficiencyObservation(receipt);
  const bundle = createSustainabilityEvidenceBundle({
    receipt,
    metadata: {
      energyWh: receipt.estimatedEnergyWh,
      renewableRatio: receipt.renewableRatio,
      source: 'package-test',
    },
    efficiency: {
      energyPerSecondWh: receipt.estimatedEnergyWh / (receipt.durationMs / 1000),
    },
  });
  const chain = createSustainabilityEvidenceChain({ receipt, observation, bundle });
  const evidenceExport = createSustainabilityEvidenceExport({
    receipt,
    observation,
    bundle,
    chain,
  });
  return { receipt, observation, bundle, chain, evidenceExport };
}

describe('sustainability evidence package', () => {
  test('creates one verifiable package over the full evidence lineage', () => {
    const artifacts = createArtifacts();
    const evidencePackage = createSustainabilityEvidencePackage(artifacts);

    expect(validateSustainabilityReceipt(evidencePackage.receipt)).toBe(true);
    expect(
      validateSustainabilityEfficiencyObservation(
        evidencePackage.observation,
        evidencePackage.receipt,
      ),
    ).toBe(true);
    expect(validateSustainabilityEvidenceBundle(evidencePackage.bundle)).toBe(true);
    expect(validateSustainabilityEvidenceChain(evidencePackage.chain, evidencePackage)).toBe(true);
    expect(
      validateSustainabilityEvidenceExport(evidencePackage.evidenceExport, evidencePackage),
    ).toBe(true);
    expect(validateSustainabilityEvidencePackage(evidencePackage)).toBe(true);
    expect(evidencePackage.packageFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(evidencePackage.manifest).toEqual({
      receiptFingerprint: artifacts.receipt.receiptFingerprint,
      observationFingerprint: artifacts.observation.observationFingerprint,
      bundleFingerprint: artifacts.bundle.bundleFingerprint,
      chainFingerprint: artifacts.chain.chainFingerprint,
      exportFingerprint: artifacts.evidenceExport.exportFingerprint,
    });
    expect(evidencePackage.safety).toEqual({
      advisoryOnly: true,
      authoritative: false,
      recommendsAction: false,
      schedulesWorkloads: false,
      deploysWorkloads: false,
      physicalActuation: false,
    });
  });

  test('preserves package identity across JSON transport', () => {
    const evidencePackage = createSustainabilityEvidencePackage(createArtifacts());
    const transported = JSON.parse(JSON.stringify(evidencePackage));

    expect(validateSustainabilityEvidencePackage(transported)).toBe(true);
    expect(transported.packageFingerprint).toBe(evidencePackage.packageFingerprint);
    expect(transported.manifest).toEqual(evidencePackage.manifest);
  });

  test('rejects cross-run substitution even when every substituted artifact is independently valid', () => {
    const original = createSustainabilityEvidencePackage(createArtifacts('run-package-1'));
    const substitute = createSustainabilityEvidencePackage(createArtifacts('run-package-2'));

    expect(validateSustainabilityEvidencePackage(original)).toBe(true);
    expect(validateSustainabilityEvidencePackage(substitute)).toBe(true);
    expect(
      validateSustainabilityEvidencePackage({
        ...original,
        evidenceExport: substitute.evidenceExport,
      }),
    ).toBe(false);
    expect(
      validateSustainabilityEvidencePackage({
        ...original,
        chain: substitute.chain,
      }),
    ).toBe(false);
  });

  test('rejects manifest replay and authority widening', () => {
    const evidencePackage = createSustainabilityEvidencePackage(createArtifacts());

    expect(
      validateSustainabilityEvidencePackage({
        ...evidencePackage,
        manifest: {
          ...evidencePackage.manifest,
          exportFingerprint: '0'.repeat(64),
        },
      }),
    ).toBe(false);
    expect(
      validateSustainabilityEvidencePackage({
        ...evidencePackage,
        safety: { ...evidencePackage.safety, authoritative: true },
      }),
    ).toBe(false);
  });

  test('fails closed on deceptive package descriptors without evaluating getters', () => {
    const evidencePackage = createSustainabilityEvidencePackage(createArtifacts());
    let getterReads = 0;
    const accessorPackage = { ...evidencePackage };
    Object.defineProperty(accessorPackage, 'packageFingerprint', {
      enumerable: true,
      get() {
        getterReads += 1;
        return evidencePackage.packageFingerprint;
      },
    });

    expect(validateSustainabilityEvidencePackage(accessorPackage)).toBe(false);
    expect(getterReads).toBe(0);

    const hiddenPackage = { ...evidencePackage };
    Object.defineProperty(hiddenPackage, 'hidden', { value: true, enumerable: false });
    expect(validateSustainabilityEvidencePackage(hiddenPackage)).toBe(false);

    const symbolicPackage = { ...evidencePackage };
    symbolicPackage[Symbol('hidden')] = true;
    expect(validateSustainabilityEvidencePackage(symbolicPackage)).toBe(false);
  });
});
