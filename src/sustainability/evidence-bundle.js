export function snapshotSustainabilityEvidence(value, path = 'evidence', seen = new WeakSet()) {
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

export function createSustainabilityEvidenceBundle({ receipt, metadata, efficiency }) {
  if (!receipt || !metadata || !efficiency) {
    throw new Error('Sustainability evidence bundle requires complete inputs');
  }

  return Object.freeze({
    receipt: snapshotSustainabilityEvidence(receipt, 'receipt'),
    metadata: snapshotSustainabilityEvidence(metadata, 'metadata'),
    efficiency: snapshotSustainabilityEvidence(efficiency, 'efficiency'),
    version: 1,
  });
}
