import { createHash } from 'node:crypto';
import { validateSustainabilityEvidenceChain } from './evidence-chain.js';

const EVIDENCE_EXPORT_VERSION = 1;
const EXPORT_KEYS = Object.freeze([
  'version',
  'chainFingerprint',
  'receiptFingerprint',
  'observationFingerprint',
  'bundleFingerprint',
  'durationMs',
  'estimatedEnergyWh',
  'renewableRatio',
  'averagePowerWatts',
  'estimatedNonRenewableShareEnergyWh',
  'interpretation',
  'safety',
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

function finiteNonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}

function finiteRatio(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function exportSafety() {
  return Object.freeze({
    advisoryOnly: true,
    authoritative: false,
    recommendsAction: false,
    schedulesWorkloads: false,
    deploysWorkloads: false,
    physicalActuation: false,
  });
}

function exportBody({ receipt, observation, bundle, chain }) {
  if (!validateSustainabilityEvidenceChain(chain, { receipt, observation, bundle })) {
    throw new TypeError('validated sustainability evidence chain is required');
  }

  const averagePowerWatts = observation.metrics?.averagePower?.value;
  const estimatedNonRenewableShareEnergyWh =
    observation.metrics?.estimatedNonRenewableShareEnergy?.value;
  if (!finiteNonNegative(receipt.durationMs)) throw new TypeError('durationMs must be non-negative');
  if (!finiteNonNegative(receipt.estimatedEnergyWh)) {
    throw new TypeError('estimatedEnergyWh must be non-negative');
  }
  if (!finiteRatio(receipt.renewableRatio)) throw new TypeError('renewableRatio must be a ratio');
  if (!finiteNonNegative(averagePowerWatts)) {
    throw new TypeError('averagePowerWatts must be non-negative');
  }
  if (!finiteNonNegative(estimatedNonRenewableShareEnergyWh)) {
    throw new TypeError('estimatedNonRenewableShareEnergyWh must be non-negative');
  }

  return Object.freeze({
    version: EVIDENCE_EXPORT_VERSION,
    chainFingerprint: chain.chainFingerprint,
    receiptFingerprint: receipt.receiptFingerprint,
    observationFingerprint: observation.observationFingerprint,
    bundleFingerprint: bundle.bundleFingerprint,
    durationMs: receipt.durationMs,
    estimatedEnergyWh: receipt.estimatedEnergyWh,
    renewableRatio: receipt.renewableRatio,
    averagePowerWatts,
    estimatedNonRenewableShareEnergyWh,
    interpretation: 'verified-sustainability-export',
    safety: exportSafety(),
  });
}

export function createSustainabilityEvidenceExport({ receipt, observation, bundle, chain } = {}) {
  const body = exportBody({ receipt, observation, bundle, chain });
  return Object.freeze({
    ...body,
    exportFingerprint: fingerprint(body),
  });
}

export function validateSustainabilityEvidenceExport(
  evidenceExport,
  { receipt, observation, bundle, chain } = {},
) {
  try {
    const values = readExactDataObject(evidenceExport, EXPORT_KEYS);
    if (!values) return false;
    if (values.version !== EVIDENCE_EXPORT_VERSION) return false;
    if (values.interpretation !== 'verified-sustainability-export') return false;
    if (
      typeof values.exportFingerprint !== 'string' ||
      !/^[a-f0-9]{64}$/.test(values.exportFingerprint)
    ) {
      return false;
    }

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

    const expected = exportBody({ receipt, observation, bundle, chain });
    for (const key of EXPORT_KEYS) {
      if (key === 'exportFingerprint' || key === 'safety') continue;
      if (values[key] !== expected[key]) return false;
    }
    const expectedSafety = expected.safety;
    if (SAFETY_KEYS.some((key) => safety[key] !== expectedSafety[key])) return false;
    return values.exportFingerprint === fingerprint(expected);
  } catch {
    return false;
  }
}

export { EVIDENCE_EXPORT_VERSION as SUSTAINABILITY_EVIDENCE_EXPORT_VERSION };
