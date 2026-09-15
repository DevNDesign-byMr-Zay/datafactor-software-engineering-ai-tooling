import { createHash } from 'node:crypto';
import { calculateSustainabilityEfficiency } from './efficiency-score.js';
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
import { createSustainabilityMetadata } from './sustainability-metadata.js';

const EVIDENCE_PACKAGE_VERSION = 1;
const PACKAGE_KEYS = Object.freeze([
  'version',
  'receipt',
  'observation',
  'bundle',
  'chain',
  'evidenceExport',
  'manifest',
  'interpretation',
  'safety',
  'packageFingerprint',
]);
const ARTIFACT_INPUT_KEYS = Object.freeze([
  'receipt',
  'observation',
  'bundle',
  'chain',
  'evidenceExport',
]);
const EXECUTION_INPUT_KEYS = Object.freeze([
  'workload',
  'durationMs',
  'estimatedEnergyWh',
  'renewableRatio',
  'source',
]);
const MANIFEST_KEYS = Object.freeze([
  'receiptFingerprint',
  'observationFingerprint',
  'bundleFingerprint',
  'chainFingerprint',
  'exportFingerprint',
]);
const SAFETY_KEYS = Object.freeze([
  'advisoryOnly',
  'authoritative',
  'recommendsAction',
  'schedulesWorkloads',
  'deploysWorkloads',
  'physicalActuation',
]);

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function fingerprint(value) {
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)), 'utf8')
    .digest('hex');
}

function readCreationDataObject(value, allowedKeys, requiredKeys = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('evidence package input must be a plain object');
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError('evidence package input must use a plain object');
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError('evidence package input must not contain symbol properties');
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors);
  const unexpected = keys.find((key) => !allowedKeys.includes(key));
  if (unexpected) {
    throw new TypeError(`evidence package input contains unsupported field: ${unexpected}`);
  }

  const copy = {};
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor.enumerable) {
      throw new TypeError(`evidence package input.${key} must be enumerable evidence`);
    }
    if ('get' in descriptor || 'set' in descriptor) {
      throw new TypeError(`evidence package input.${key} must not use accessors`);
    }
    copy[key] = descriptor.value;
  }

  const missing = requiredKeys.find((key) => !Object.hasOwn(copy, key));
  if (missing) throw new TypeError(`evidence package input is missing required field: ${missing}`);
  return copy;
}

function readExactDataObject(value, expectedKeys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (Object.getPrototypeOf(value) !== Object.prototype) return null;
  if (Object.getOwnPropertySymbols(value).length > 0) return null;

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actualKeys = Object.keys(descriptors).sort();
  const sortedExpected = [...expectedKeys].sort();
  if (
    actualKeys.length !== sortedExpected.length ||
    actualKeys.some((key, index) => key !== sortedExpected[index])
  ) {
    return null;
  }

  const copy = {};
  for (const key of sortedExpected) {
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || 'get' in descriptor || 'set' in descriptor) {
      return null;
    }
    copy[key] = descriptor.value;
  }
  return copy;
}

function packageSafety() {
  return Object.freeze({
    advisoryOnly: true,
    authoritative: false,
    recommendsAction: false,
    schedulesWorkloads: false,
    deploysWorkloads: false,
    physicalActuation: false,
  });
}

function validatedArtifacts(input) {
  const values = readCreationDataObject(input, ARTIFACT_INPUT_KEYS, ARTIFACT_INPUT_KEYS);
  const { receipt, observation, bundle, chain, evidenceExport } = values;
  if (!validateSustainabilityReceipt(receipt)) {
    throw new TypeError('validated sustainability receipt is required');
  }
  if (!validateSustainabilityEfficiencyObservation(observation, receipt)) {
    throw new TypeError('validated sustainability observation is required');
  }
  if (!validateSustainabilityEvidenceBundle(bundle)) {
    throw new TypeError('validated sustainability evidence bundle is required');
  }
  if (!validateSustainabilityEvidenceChain(chain, { receipt, observation, bundle })) {
    throw new TypeError('validated sustainability evidence chain is required');
  }
  if (
    !validateSustainabilityEvidenceExport(evidenceExport, {
      receipt,
      observation,
      bundle,
      chain,
    })
  ) {
    throw new TypeError('validated sustainability evidence export is required');
  }

  return Object.freeze({ receipt, observation, bundle, chain, evidenceExport });
}

function packageManifest({ receipt, observation, bundle, chain, evidenceExport }) {
  return Object.freeze({
    receiptFingerprint: receipt.receiptFingerprint,
    observationFingerprint: observation.observationFingerprint,
    bundleFingerprint: bundle.bundleFingerprint,
    chainFingerprint: chain.chainFingerprint,
    exportFingerprint: evidenceExport.exportFingerprint,
  });
}

function packageBody(artifacts) {
  const manifest = packageManifest(artifacts);
  return Object.freeze({
    version: EVIDENCE_PACKAGE_VERSION,
    ...artifacts,
    manifest,
    interpretation: 'verified-sustainability-package',
    safety: packageSafety(),
  });
}

function packageIdentity(body) {
  return {
    version: body.version,
    manifest: body.manifest,
    interpretation: body.interpretation,
    safety: body.safety,
  };
}

export function createSustainabilityEvidencePackage(input = {}) {
  const artifacts = validatedArtifacts(input);
  const body = packageBody(artifacts);
  return Object.freeze({
    ...body,
    packageFingerprint: fingerprint(packageIdentity(body)),
  });
}

export function createSustainabilityEvidencePackageFromExecution(input = {}) {
  const values = readCreationDataObject(input, EXECUTION_INPUT_KEYS, [
    'workload',
    'durationMs',
    'estimatedEnergyWh',
  ]);
  const renewableRatio = Object.hasOwn(values, 'renewableRatio') ? values.renewableRatio : 0;
  const source = Object.hasOwn(values, 'source') ? values.source : 'runtime';
  const receipt = createSustainabilityReceipt({
    workload: values.workload,
    durationMs: values.durationMs,
    estimatedEnergyWh: values.estimatedEnergyWh,
    renewableRatio,
  });
  const observation = createSustainabilityEfficiencyObservation(receipt);
  const metadata = createSustainabilityMetadata({
    energyWh: receipt.estimatedEnergyWh,
    renewableRatio: receipt.renewableRatio,
    source,
  });
  const efficiency = calculateSustainabilityEfficiency({
    durationMs: receipt.durationMs,
    estimatedEnergyWh: receipt.estimatedEnergyWh,
    renewableRatio: receipt.renewableRatio,
  });
  const bundle = createSustainabilityEvidenceBundle({ receipt, metadata, efficiency });
  const chain = createSustainabilityEvidenceChain({ receipt, observation, bundle });
  const evidenceExport = createSustainabilityEvidenceExport({
    receipt,
    observation,
    bundle,
    chain,
  });

  return createSustainabilityEvidencePackage({
    receipt,
    observation,
    bundle,
    chain,
    evidenceExport,
  });
}

export function validateSustainabilityEvidencePackage(evidencePackage) {
  try {
    const values = readExactDataObject(evidencePackage, PACKAGE_KEYS);
    if (!values) return false;
    if (values.version !== EVIDENCE_PACKAGE_VERSION) return false;
    if (values.interpretation !== 'verified-sustainability-package') return false;
    if (
      typeof values.packageFingerprint !== 'string' ||
      !/^[a-f0-9]{64}$/.test(values.packageFingerprint)
    ) {
      return false;
    }

    const manifest = readExactDataObject(values.manifest, MANIFEST_KEYS);
    if (!manifest) return false;
    const safety = readExactDataObject(values.safety, SAFETY_KEYS);
    if (!safety) return false;
    if (
      safety.advisoryOnly !== true ||
      safety.authoritative !== false ||
      safety.recommendsAction !== false ||
      safety.schedulesWorkloads !== false ||
      safety.deploysWorkloads !== false ||
      safety.physicalActuation !== false
    ) {
      return false;
    }

    const artifacts = validatedArtifacts({
      receipt: values.receipt,
      observation: values.observation,
      bundle: values.bundle,
      chain: values.chain,
      evidenceExport: values.evidenceExport,
    });
    const expectedManifest = packageManifest(artifacts);
    if (MANIFEST_KEYS.some((key) => manifest[key] !== expectedManifest[key])) return false;

    const body = packageBody(artifacts);
    return values.packageFingerprint === fingerprint(packageIdentity(body));
  } catch {
    return false;
  }
}

export { EVIDENCE_PACKAGE_VERSION as SUSTAINABILITY_EVIDENCE_PACKAGE_VERSION };
