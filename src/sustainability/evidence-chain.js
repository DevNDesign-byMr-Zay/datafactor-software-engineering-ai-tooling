import { createHash } from 'node:crypto';
import { validateSustainabilityReceipt } from './execution-receipt.js';
import { validateSustainabilityEfficiencyObservation } from './efficiency-observation.js';
import { validateSustainabilityEvidenceBundle } from './evidence-bundle.js';

const EVIDENCE_CHAIN_VERSION = 1;
const CHAIN_KEYS = Object.freeze([
  'version',
  'receiptFingerprint',
  'observationFingerprint',
  'bundleFingerprint',
  'interpretation',
  'safety',
  'chainFingerprint',
]);
const SAFETY_KEYS = Object.freeze([
  'advisoryOnly',
  'authoritative',
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

function chainSafety() {
  return Object.freeze({
    advisoryOnly: true,
    authoritative: false,
    schedulesWorkloads: false,
    deploysWorkloads: false,
    physicalActuation: false,
  });
}

function validatedReferences({ receipt, observation, bundle }) {
  if (!validateSustainabilityReceipt(receipt)) {
    throw new TypeError('validated sustainability receipt is required');
  }
  if (!validateSustainabilityEfficiencyObservation(observation, receipt)) {
    throw new TypeError('validated sustainability observation is required');
  }
  if (!validateSustainabilityEvidenceBundle(bundle)) {
    throw new TypeError('validated sustainability evidence bundle is required');
  }
  if (!validateSustainabilityReceipt(bundle.receipt)) {
    throw new TypeError('evidence bundle must contain a validated sustainability receipt');
  }
  if (observation.sourceReceiptFingerprint !== receipt.receiptFingerprint) {
    throw new TypeError('observation receipt lineage does not match');
  }
  if (bundle.receipt.receiptFingerprint !== receipt.receiptFingerprint) {
    throw new TypeError('bundle receipt lineage does not match');
  }

  return Object.freeze({
    receiptFingerprint: receipt.receiptFingerprint,
    observationFingerprint: observation.observationFingerprint,
    bundleFingerprint: bundle.bundleFingerprint,
  });
}

function chainBody(references) {
  return Object.freeze({
    version: EVIDENCE_CHAIN_VERSION,
    ...references,
    interpretation: 'evidence-chain-only',
    safety: chainSafety(),
  });
}

export function createSustainabilityEvidenceChain({ receipt, observation, bundle } = {}) {
  const body = chainBody(validatedReferences({ receipt, observation, bundle }));
  return Object.freeze({
    ...body,
    chainFingerprint: fingerprint(body),
  });
}

export function validateSustainabilityEvidenceChain(chain, { receipt, observation, bundle } = {}) {
  try {
    const values = readExactDataObject(chain, CHAIN_KEYS);
    if (!values) return false;
    if (values.version !== EVIDENCE_CHAIN_VERSION) return false;
    if (values.interpretation !== 'evidence-chain-only') return false;
    if (typeof values.chainFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(values.chainFingerprint)) {
      return false;
    }

    const safety = readExactDataObject(values.safety, SAFETY_KEYS);
    if (!safety) return false;
    if (
      safety.advisoryOnly !== true ||
      safety.authoritative !== false ||
      safety.schedulesWorkloads !== false ||
      safety.deploysWorkloads !== false ||
      safety.physicalActuation !== false
    ) {
      return false;
    }

    const expectedReferences = validatedReferences({ receipt, observation, bundle });
    if (
      values.receiptFingerprint !== expectedReferences.receiptFingerprint ||
      values.observationFingerprint !== expectedReferences.observationFingerprint ||
      values.bundleFingerprint !== expectedReferences.bundleFingerprint
    ) {
      return false;
    }

    const body = chainBody(expectedReferences);
    return values.chainFingerprint === fingerprint(body);
  } catch {
    return false;
  }
}

export { EVIDENCE_CHAIN_VERSION as SUSTAINABILITY_EVIDENCE_CHAIN_VERSION };
