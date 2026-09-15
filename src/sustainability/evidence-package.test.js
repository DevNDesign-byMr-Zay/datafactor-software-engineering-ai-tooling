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
  createSustainabilityEvidencePackageFromExecution,
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

  test('rejects substitution of every independently valid lineage artifact', () => {
    const original = createSustainabilityEvidencePackage(createArtifacts('run-package-1'));
    const substitute = createSustainabilityEvidencePackage(createArtifacts('run-package-2'));

    for (const key of ['receipt', 'observation', 'bundle', 'evidenceExport']) {
      expect(
        validateSustainabilityEvidencePackage({
          ...original,
          [key]: substitute[key],
        }),
      ).toBe(false);
    }
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

  test('package creation rejects top-level artifact accessors without evaluating getters', () => {
    const artifacts = createArtifacts();
    let getterReads = 0;
    const deceptive = { ...artifacts };
    Object.defineProperty(deceptive, 'receipt', {
      enumerable: true,
      get() {
        getterReads += 1;
        return artifacts.receipt;
      },
    });

    expect(() => createSustainabilityEvidencePackage(deceptive)).toThrow(/must not use accessors/);
    expect(getterReads).toBe(0);

    expect(() => createSustainabilityEvidencePackage({ ...artifacts, unexpected: true })).toThrow(
      /unsupported field/,
    );

    const symbolic = { ...artifacts };
    symbolic[Symbol('authority')] = true;
    expect(() => createSustainabilityEvidencePackage(symbolic)).toThrow(/symbol properties/);
  });

  test('one-shot package creation rejects deceptive execution descriptors before reading them', () => {
    let durationGetterReads = 0;
    let sourceGetterReads = 0;
    const input = {
      workload: { name: 'package-test', runId: 'run-one-shot' },
      estimatedEnergyWh: 12,
    };
    Object.defineProperty(input, 'durationMs', {
      enumerable: true,
      get() {
        durationGetterReads += 1;
        return 1_800_000;
      },
    });
    Object.defineProperty(input, 'source', {
      enumerable: true,
      get() {
        sourceGetterReads += 1;
        return 'package-test';
      },
    });

    expect(() => createSustainabilityEvidencePackageFromExecution(input)).toThrow(
      /must not use accessors/,
    );
    expect(durationGetterReads).toBe(0);
    expect(sourceGetterReads).toBe(0);

    const inherited = Object.create({ durationMs: 1_800_000 });
    inherited.workload = { name: 'package-test' };
    inherited.estimatedEnergyWh = 12;
    expect(() => createSustainabilityEvidencePackageFromExecution(inherited)).toThrow(
      /plain object/,
    );
  });

  test('one-shot package creation keeps optional defaults deterministic', () => {
    const input = {
      workload: { name: 'package-test', runId: 'run-defaults' },
      durationMs: 1_800_000,
      estimatedEnergyWh: 12,
    };
    const first = createSustainabilityEvidencePackageFromExecution(input);
    const second = createSustainabilityEvidencePackageFromExecution({ ...input });

    expect(validateSustainabilityEvidencePackage(first)).toBe(true);
    expect(first.receipt.renewableRatio).toBe(0);
    expect(first.packageFingerprint).toBe(second.packageFingerprint);
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

  test('fails closed on deceptive nested manifest and safety descriptors without evaluating getters', () => {
    const evidencePackage = createSustainabilityEvidencePackage(createArtifacts());
    let manifestGetterReads = 0;
    let safetyGetterReads = 0;

    const manifest = { ...evidencePackage.manifest };
    Object.defineProperty(manifest, 'exportFingerprint', {
      enumerable: true,
      get() {
        manifestGetterReads += 1;
        return evidencePackage.manifest.exportFingerprint;
      },
    });

    const safety = { ...evidencePackage.safety };
    Object.defineProperty(safety, 'authoritative', {
      enumerable: true,
      get() {
        safetyGetterReads += 1;
        return false;
      },
    });

    expect(
      validateSustainabilityEvidencePackage({
        ...evidencePackage,
        manifest,
      }),
    ).toBe(false);
    expect(manifestGetterReads).toBe(0);

    expect(
      validateSustainabilityEvidencePackage({
        ...evidencePackage,
        safety,
      }),
    ).toBe(false);
    expect(safetyGetterReads).toBe(0);
  });
});
