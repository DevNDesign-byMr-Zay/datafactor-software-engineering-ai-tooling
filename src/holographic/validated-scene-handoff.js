import { createHash } from 'node:crypto';
import { evaluateHolographicAcceptance } from './acceptance-gate.js';
import { validateHolographicEvidenceEnvelope } from './evidence-envelope.js';
import { fingerprintHolographicScene } from './scene-fingerprint.js';
import { validateHolographicProvenanceBinding } from './provenance-chain.js';

const HANDOFF_KEYS = Object.freeze([
  'scene',
  'sceneFingerprint',
  'acceptance',
  'provenanceBinding',
  'provenanceCommitment',
  'safety',
  'handoffFingerprint',
]);
const CREATE_INPUT_KEYS = Object.freeze([
  'envelope',
  'scene',
  'snapshotId',
  'sceneId',
  'provenanceRef',
]);
const VERIFY_OPTION_KEYS = Object.freeze(['envelope']);
const ACCEPTANCE_KEYS = Object.freeze([
  'accepted',
  'provenanceValid',
  'fingerprintValid',
  'safetyValid',
  'authoritative',
  'physicalActuation',
  'advisoryOnly',
]);
const PROVENANCE_BINDING_KEYS = Object.freeze([
  'envelopeFingerprint',
  'snapshotId',
  'sceneId',
  'provenanceRef',
]);
const SAFETY_KEYS = Object.freeze(['authoritative', 'physicalActuation', 'advisoryOnly']);

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

function captureDataEnvelope(value, expectedKeys, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${path} must be a plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must be a plain object`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${path} must not contain symbol properties`);
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const unexpected = Object.keys(descriptors).find((key) => !expectedKeys.includes(key));
  if (unexpected) throw new TypeError(`${path} contains unsupported field: ${unexpected}`);

  const copy = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable) throw new TypeError(`${path}.${key} must be enumerable data`);
    if ('get' in descriptor || 'set' in descriptor) {
      throw new TypeError(`${path}.${key} must not use accessors`);
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

function text(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
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

function snapshotEvidence(value, path = 'handoff', seen = new WeakSet()) {
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

function fingerprintHandoff(value) {
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)), 'utf8')
    .digest('hex');
}

function fingerprintProvenanceBinding(value) {
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)), 'utf8')
    .digest('hex');
}

function hasExactKeys(value, expectedKeys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function verifyAcceptance(acceptance) {
  if (!hasExactKeys(acceptance, ACCEPTANCE_KEYS)) return false;
  if (ACCEPTANCE_KEYS.some((key) => typeof acceptance[key] !== 'boolean')) return false;
  return (
    acceptance.accepted ===
      (acceptance.provenanceValid && acceptance.fingerprintValid && acceptance.safetyValid) &&
    acceptance.authoritative === false &&
    acceptance.physicalActuation === false &&
    acceptance.advisoryOnly === true
  );
}

/** Build the final advisory handoff only after provenance, fingerprint, and safety checks pass. */
export function createValidatedHolographicSceneHandoff(input = {}) {
  const { envelope, scene, snapshotId, sceneId, provenanceRef } = captureDataEnvelope(
    input,
    CREATE_INPUT_KEYS,
    'handoff input',
  );
  const capturedEnvelope = deepFreeze(snapshotEvidence(envelope, 'envelope'));
  const capturedScene = deepFreeze(snapshotEvidence(scene, 'scene'));
  const normalizedSnapshotId = text(snapshotId, 'snapshotId');
  const normalizedSceneId = text(sceneId, 'sceneId');
  const normalizedProvenanceRef = text(provenanceRef, 'provenanceRef');
  const sceneFingerprint = fingerprintHolographicScene(capturedScene);
  const acceptance = evaluateHolographicAcceptance({
    envelope: capturedEnvelope,
    scene: capturedScene,
    sceneFingerprint,
    snapshotId: normalizedSnapshotId,
    sceneId: normalizedSceneId,
    provenanceRef: normalizedProvenanceRef,
  });
  if (!acceptance.accepted) throw new TypeError('holographic scene failed acceptance gate');

  const provenanceBinding = {
    envelopeFingerprint: capturedEnvelope.fingerprint,
    snapshotId: normalizedSnapshotId,
    sceneId: normalizedSceneId,
    provenanceRef: normalizedProvenanceRef,
  };
  const provenanceCommitment = fingerprintProvenanceBinding(provenanceBinding);
  const body = {
    scene: capturedScene,
    sceneFingerprint,
    acceptance,
    provenanceBinding: Object.freeze(provenanceBinding),
    provenanceCommitment,
    safety: Object.freeze({ authoritative: false, physicalActuation: false, advisoryOnly: true }),
  };
  return deepFreeze({
    ...body,
    handoffFingerprint: fingerprintHandoff(body),
  });
}

/** Verify a handoff structurally; pass the source envelope to re-run the independent provenance gate. */
export function verifyValidatedHolographicSceneHandoff(handoff, options = {}) {
  try {
    const verifyOptions = captureDataEnvelope(options, VERIFY_OPTION_KEYS, 'verification options');
    const envelope = Object.hasOwn(verifyOptions, 'envelope') ? verifyOptions.envelope : null;
    const normalized = snapshotEvidence(handoff, 'handoff');
    if (!hasExactKeys(normalized, HANDOFF_KEYS)) return false;
    if (!/^[a-f0-9]{64}$/.test(normalized.handoffFingerprint)) return false;
    if (!normalized.scene || typeof normalized.scene !== 'object') return false;
    if (!/^[a-f0-9]{64}$/.test(normalized.sceneFingerprint)) return false;
    if (fingerprintHolographicScene(normalized.scene) !== normalized.sceneFingerprint) return false;
    if (!verifyAcceptance(normalized.acceptance)) return false;

    const binding = normalized.provenanceBinding;
    if (!hasExactKeys(binding, PROVENANCE_BINDING_KEYS)) return false;
    if (!/^[a-f0-9]{64}$/.test(binding.envelopeFingerprint)) return false;
    if (
      typeof binding.snapshotId !== 'string' ||
      typeof binding.sceneId !== 'string' ||
      typeof binding.provenanceRef !== 'string'
    )
      return false;
    if (!/^[a-f0-9]{64}$/.test(normalized.provenanceCommitment)) return false;
    if (normalized.provenanceCommitment !== fingerprintProvenanceBinding(binding)) return false;
    if (
      normalized.scene.snapshotId !== binding.snapshotId ||
      normalized.scene.sceneId !== binding.sceneId
    )
      return false;
    if (!normalized.acceptance.provenanceValid) return false;
    if (!hasExactKeys(normalized.safety, SAFETY_KEYS)) return false;
    if (
      normalized.safety.authoritative !== false ||
      normalized.safety.physicalActuation !== false ||
      normalized.safety.advisoryOnly !== true
    )
      return false;

    if (envelope != null) {
      const capturedEnvelope = snapshotEvidence(envelope, 'envelope');
      if (!validateHolographicEvidenceEnvelope(capturedEnvelope)) return false;
      if (capturedEnvelope.fingerprint !== binding.envelopeFingerprint) return false;
      if (
        !validateHolographicProvenanceBinding({
          envelope: capturedEnvelope,
          snapshotId: binding.snapshotId,
          sceneId: binding.sceneId,
          provenanceRef: binding.provenanceRef,
          scene: normalized.scene,
          sceneFingerprint: normalized.sceneFingerprint,
        })
      )
        return false;
    }

    const { handoffFingerprint, ...body } = normalized;
    return handoffFingerprint === fingerprintHandoff(body);
  } catch {
    return false;
  }
}
