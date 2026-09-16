import { createHash } from 'node:crypto';

const ENVELOPE_VERSION = 2;
const TARGETS = Object.freeze(['holo-mat', 'projector', 'volumetric-3d', 'ar-vr', 'web-dashboard']);
const BUILD_INPUT_KEYS = Object.freeze([
  'snapshotId',
  'sceneId',
  'provenanceRef',
  'target',
  'renderer',
  'payload',
  'advisoryOnly',
]);
const ENVELOPE_KEYS = Object.freeze([
  'envelopeVersion',
  'snapshotId',
  'sceneId',
  'provenanceRef',
  'target',
  'renderer',
  'payload',
  'advisoryOnly',
  'fingerprint',
  'safety',
]);
const SAFETY_KEYS = Object.freeze(['authoritative', 'physicalActuation', 'provenanceRequired']);

function text(value, name) {
  if (typeof value !== 'string' || !value.trim())
    throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function captureBuildInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('evidence envelope input must be a plain object');
  }
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('evidence envelope input must be a plain object');
  }
  if (Object.getOwnPropertySymbols(input).length > 0) {
    throw new TypeError('evidence envelope input must not contain symbol properties');
  }

  const descriptors = Object.getOwnPropertyDescriptors(input);
  const unexpected = Object.keys(descriptors).find((key) => !BUILD_INPUT_KEYS.includes(key));
  if (unexpected) throw new TypeError(`evidence envelope input contains unsupported field: ${unexpected}`);

  const copy = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable) {
      throw new TypeError(`evidence envelope input.${key} must be enumerable data`);
    }
    if ('get' in descriptor || 'set' in descriptor) {
      throw new TypeError(`evidence envelope input.${key} must not use accessors`);
    }
    Object.defineProperty(copy, key, {
      value: descriptor.value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return copy;
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
    copy.push(snapshotEvidence(descriptor.value, `${path}[${index}]`, seen));
  }
  if (Reflect.ownKeys(value).some((key) => typeof key !== 'string' || !allowedKeys.has(key))) {
    throw new TypeError(`${path} arrays must not contain extra properties`);
  }
  return copy;
}

function snapshotObject(value, path, seen) {
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${path} must use plain objects`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${path} must not contain symbol properties`);
  }
  const copy = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!descriptor.enumerable) throw new TypeError(`${path}.${key} must be enumerable evidence`);
    if ('get' in descriptor || 'set' in descriptor) {
      throw new TypeError(`${path}.${key} must not use accessors`);
    }
    Object.defineProperty(copy, key, {
      value: snapshotEvidence(descriptor.value, `${path}.${key}`, seen),
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return copy;
}

function snapshotEvidence(value, path = 'envelope', seen = new WeakSet()) {
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
  const copy = Array.isArray(value)
    ? snapshotArray(value, path, seen)
    : snapshotObject(value, path, seen);
  seen.delete(value);
  return copy;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function hasExactKeys(value, expectedKeys) {
  const keys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}
function fingerprint(value) {
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)), 'utf8')
    .digest('hex');
}

export function buildHolographicEvidenceEnvelope(input = {}) {
  const values = captureBuildInput(input);
  const snapshotId = values.snapshotId;
  const sceneId = values.sceneId;
  const provenanceRef = values.provenanceRef;
  const target = Object.hasOwn(values, 'target') ? values.target : 'web-dashboard';
  const renderer = Object.hasOwn(values, 'renderer') ? values.renderer : 'renderer-neutral';
  const payload = Object.hasOwn(values, 'payload') ? values.payload : null;
  const advisoryOnly = Object.hasOwn(values, 'advisoryOnly') ? values.advisoryOnly : true;

  const capturedPayload = deepFreeze(snapshotEvidence(payload, 'payload'));
  const envelope = {
    envelopeVersion: ENVELOPE_VERSION,
    snapshotId: text(snapshotId, 'snapshotId'),
    sceneId: text(sceneId, 'sceneId'),
    provenanceRef: text(provenanceRef, 'provenanceRef'),
    target: text(target, 'target'),
    renderer: text(renderer, 'renderer'),
    payload: capturedPayload,
    advisoryOnly: advisoryOnly === true,
  };
  if (!TARGETS.includes(envelope.target))
    throw new TypeError(`unsupported holographic target: ${envelope.target}`);
  if (!envelope.advisoryOnly) throw new TypeError('holographic evidence must remain advisory-only');
  return Object.freeze({
    ...envelope,
    fingerprint: fingerprint(envelope),
    safety: Object.freeze({
      authoritative: false,
      physicalActuation: false,
      provenanceRequired: true,
    }),
  });
}

export function validateHolographicEvidenceEnvelope(envelope) {
  try {
    const value = snapshotEvidence(envelope);
    if (!hasExactKeys(value, ENVELOPE_KEYS)) return false;
    if (
      value.envelopeVersion !== ENVELOPE_VERSION ||
      typeof value.snapshotId !== 'string' ||
      !value.snapshotId.trim() ||
      typeof value.sceneId !== 'string' ||
      !value.sceneId.trim() ||
      typeof value.provenanceRef !== 'string' ||
      !value.provenanceRef.trim() ||
      !TARGETS.includes(value.target) ||
      typeof value.renderer !== 'string' ||
      !value.renderer.trim() ||
      value.advisoryOnly !== true ||
      typeof value.fingerprint !== 'string' ||
      !/^[a-f0-9]{64}$/.test(value.fingerprint)
    )
      return false;
    if (!hasExactKeys(value.safety, SAFETY_KEYS)) return false;
    if (
      value.safety.authoritative !== false ||
      value.safety.physicalActuation !== false ||
      value.safety.provenanceRequired !== true
    )
      return false;
    const unsigned = {
      envelopeVersion: value.envelopeVersion,
      snapshotId: value.snapshotId,
      sceneId: value.sceneId,
      provenanceRef: value.provenanceRef,
      target: value.target,
      renderer: value.renderer,
      payload: value.payload,
      advisoryOnly: value.advisoryOnly,
    };
    return value.fingerprint === fingerprint(unsigned);
  } catch {
    return false;
  }
}

export { ENVELOPE_VERSION, TARGETS };
