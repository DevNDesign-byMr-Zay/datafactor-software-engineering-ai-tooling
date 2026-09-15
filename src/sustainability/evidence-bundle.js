import { createHash } from 'node:crypto';

const EVIDENCE_BUNDLE_VERSION = 1;

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

function bundleBody({ receipt, metadata, efficiency }) {
  return Object.freeze({
    receipt: snapshotSustainabilityEvidence(receipt, 'receipt'),
    metadata: snapshotSustainabilityEvidence(metadata, 'metadata'),
    efficiency: snapshotSustainabilityEvidence(efficiency, 'efficiency'),
    version: EVIDENCE_BUNDLE_VERSION,
  });
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
    if (bundle.version !== EVIDENCE_BUNDLE_VERSION) return false;
    if (!/^[a-f0-9]{64}$/.test(bundle.bundleFingerprint)) return false;

    const body = bundleBody({
      receipt: bundle.receipt,
      metadata: bundle.metadata,
      efficiency: bundle.efficiency,
    });
    if (Object.keys(bundle).length !== Object.keys(body).length + 1) return false;
    return bundle.bundleFingerprint === fingerprint(body);
  } catch {
    return false;
  }
}

export { EVIDENCE_BUNDLE_VERSION as SUSTAINABILITY_EVIDENCE_BUNDLE_VERSION };
