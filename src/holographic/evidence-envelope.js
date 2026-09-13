import { createHash } from 'node:crypto';

const ENVELOPE_VERSION = 2;
const TARGETS = Object.freeze(['holo-mat', 'projector', 'volumetric-3d', 'ar-vr', 'web-dashboard']);

function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}
function text(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}
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

export function buildHolographicEvidenceEnvelope({
  snapshotId,
  sceneId,
  provenanceRef,
  target = 'web-dashboard',
  renderer = 'renderer-neutral',
  payload = null,
  advisoryOnly = true,
} = {}) {
  const envelope = {
    envelopeVersion: ENVELOPE_VERSION,
    snapshotId: text(snapshotId, 'snapshotId'),
    sceneId: text(sceneId, 'sceneId'),
    provenanceRef: text(provenanceRef, 'provenanceRef'),
    target: text(target, 'target'),
    renderer: text(renderer, 'renderer'),
    payload,
    advisoryOnly: advisoryOnly === true,
  };
  if (!TARGETS.includes(envelope.target)) {
    throw new TypeError(`unsupported holographic target: ${envelope.target}`);
  }
  if (!envelope.advisoryOnly) {
    throw new TypeError('holographic evidence must remain advisory-only');
  }
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
    const value = object(envelope, 'envelope');
    if (
      value.envelopeVersion !== ENVELOPE_VERSION ||
      typeof value.snapshotId !== 'string' ||
      typeof value.sceneId !== 'string' ||
      typeof value.provenanceRef !== 'string' ||
      !TARGETS.includes(value.target) ||
      value.advisoryOnly !== true ||
      value.safety?.authoritative !== false ||
      value.safety?.physicalActuation !== false ||
      value.safety?.provenanceRequired !== true ||
      typeof value.fingerprint !== 'string'
    ) {
      return false;
    }
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
