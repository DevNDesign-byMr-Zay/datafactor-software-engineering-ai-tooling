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

  if (Array.isArray(value)) {
    const copy = Object.freeze(
      value.map((item, index) => snapshotSustainabilityEvidence(item, `${path}[${index}]`, seen)),
    );
    seen.delete(value);
    return copy;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must use plain objects`);
  }

  const copy = {};
  for (const [key, nested] of Object.entries(value)) {
    copy[key] = snapshotSustainabilityEvidence(nested, `${path}.${key}`, seen);
  }
  seen.delete(value);
  return Object.freeze(copy);
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
