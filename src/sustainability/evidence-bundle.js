import { createHash } from 'node:crypto';
import { validateSustainabilityEfficiencyObservation } from './efficiency-observation.js';

const EVIDENCE_BUNDLE_VERSION = 1;
const EVIDENCE_BUNDLE_KEYS = Object.freeze([
  'receipt',
  'metadata',
  'efficiency',
  'version',
  'bundleFingerprint',
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

function snapshotArray(value, path, seen) {
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${path} must not contain symbol properties`);
  }

  const allowedKeys = new Set(['length']);
  const copy = [];
  for (let index = 0; index < value.length; index += 1) {
    const key = String(index);
    allowedKeys.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) throw new TypeError(`${path} must not contain sparse arrays`);
    if ('get' in descriptor || 'set' in descriptor) {
      throw new TypeError(`${path}[${index}] must not use accessors`);
    }
    copy.push(snapshotSustainabilityEvidence(descriptor.value, `${path}[${index}]`, seen));
  }

  const unexpectedKey = Reflect.ownKeys(value).find(
    (key) => typeof key !== 'string' || !allowedKeys.has(key),
  );
  if (unexpectedKey !== undefined) {
    throw new TypeError(`${path} arrays must not contain extra properties`);
  }

  return Object.freeze(copy);
}

function snapshotPlainObject(value, path, seen) {
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${path} must not contain symbol properties`);
  }

  const copy = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!descriptor.enumerable) {
      throw new TypeError(`${path}.${key} must be enumerable evidence`);
    }
    if ('get' in descriptor || 'set' in descriptor) {
      throw new TypeError(`${path}.${key} must not use accessors`);
    }
    copy[key] = snapshotSustainabilityEvidence(descriptor.value, `${path}.${key}`, seen);
  }
  return Object.freeze(copy);
}

function snapshotSustainabilityEvidence(value, path = 'evidence', seen = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${path} numbers must be finite`);
    return value;
  }
  if (!value || typeof value !== 'object') {
    throw new TypeError(`${path} must contain JSON-compatible evidence`);
  }
  if (seen.has(value)) throw new TypeError(`${path} must not contain circular references`);
  seen.add(value);

  let copy;
  if (Array.isArray(value)) {
    copy = snapshotArray(value, path, seen);
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${path} must use plain objects`);
    }
    copy = snapshotPlainObject(value, path, seen);
  }

  seen.delete(value);
  return copy;
}

function assertObservationLineage(receipt, efficiency) {
  const hasObservationFingerprint = Object.hasOwn(efficiency, 'observationFingerprint');
  const hasSourceReceiptFingerprint = Object.hasOwn(efficiency, 'sourceReceiptFingerprint');
  if (!hasObservationFingerprint && !hasSourceReceiptFingerprint) return;
  if (!hasObservationFingerprint || !hasSourceReceiptFingerprint) {
    throw new TypeError('efficiency observation lineage is incomplete');
  }
  if (!validateSustainabilityEfficiencyObservation(efficiency, receipt)) {
    throw new TypeError('efficiency observation must match bundled receipt');
  }
}

function bundleBody({ receipt, metadata, efficiency }) {
  const capturedReceipt = snapshotSustainabilityEvidence(receipt, 'receipt');
  const capturedMetadata = snapshotSustainabilityEvidence(metadata, 'metadata');
  const capturedEfficiency = snapshotSustainabilityEvidence(efficiency, 'efficiency');
  assertObservationLineage(capturedReceipt, capturedEfficiency);

  return Object.freeze({
    receipt: capturedReceipt,
    metadata: capturedMetadata,
    efficiency: capturedEfficiency,
    version: EVIDENCE_BUNDLE_VERSION,
  });
}

function readBundleData(bundle) {
  if (Object.getPrototypeOf(bundle) !== Object.prototype) return null;
  if (Object.getOwnPropertySymbols(bundle).length > 0) return null;

  const descriptors = Object.getOwnPropertyDescriptors(bundle);
  const keys = Object.keys(descriptors);
  if (keys.length !== EVIDENCE_BUNDLE_KEYS.length) return null;
  if (keys.some((key) => !EVIDENCE_BUNDLE_KEYS.includes(key))) return null;

  const values = {};
  for (const key of EVIDENCE_BUNDLE_KEYS) {
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || 'get' in descriptor || 'set' in descriptor) {
      return null;
    }
    values[key] = descriptor.value;
  }
  return values;
}

export function createSustainabilityEvidenceBundle({ receipt, metadata, efficiency }) {
  if (!receipt || !metadata || !efficiency) {
    throw new Error('Sustainability evidence bundle requires complete inputs');
  }

  const body = bundleBody({ receipt, metadata, efficiency });
  return Object.freeze({
    ...body,
    bundleFingerprint: fingerprint(body),
  });
}

export function validateSustainabilityEvidenceBundle(bundle) {
  try {
    if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) return false;
    const data = readBundleData(bundle);
    if (!data) return false;
    if (data.version !== EVIDENCE_BUNDLE_VERSION) return false;
    if (!/^[a-f0-9]{64}$/.test(data.bundleFingerprint)) return false;

    const body = bundleBody({
      receipt: data.receipt,
      metadata: data.metadata,
      efficiency: data.efficiency,
    });
    return data.bundleFingerprint === fingerprint(body);
  } catch {
    return false;
  }
}

export { EVIDENCE_BUNDLE_VERSION as SUSTAINABILITY_EVIDENCE_BUNDLE_VERSION };
