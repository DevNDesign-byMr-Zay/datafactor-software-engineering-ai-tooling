import { createHash } from 'node:crypto';

const ENVELOPE_VERSION = 2;
const TARGETS = Object.freeze(['holo-mat', 'projector', 'volumetric-3d', 'ar-vr', 'web-dashboard']);

function object(value, name) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`${name} must be a plain object`);
  }
  return value;
}
function text(value, name) {
  if (typeof value !== 'string' || !value.trim())
    throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
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
    const value = object(envelope, 'envelope');
    if (
      !Object.hasOwn(value, 'envelopeVersion') ||
      value.envelopeVersion !== ENVELOPE_VERSION ||
      !Object.hasOwn(value, 'snapshotId') ||
      typeof value.snapshotId !== 'string' ||
      !value.snapshotId.trim() ||
      !Object.hasOwn(value, 'sceneId') ||
      typeof value.sceneId !== 'string' ||
      !value.sceneId.trim() ||
      !Object.hasOwn(value, 'provenanceRef') ||
      typeof value.provenanceRef !== 'string' ||
      !value.provenanceRef.trim() ||
      !Object.hasOwn(value, 'target') ||
      !TARGETS.includes(value.target) ||
      !Object.hasOwn(value, 'renderer') ||
      typeof value.renderer !== 'string' ||
      !value.renderer.trim() ||
      !Object.hasOwn(value, 'advisoryOnly') ||
      value.advisoryOnly !== true ||
      !Object.hasOwn(value, 'safety') ||
      !value.safety ||
      typeof value.safety !== 'object' ||
      Array.isArray(value.safety) ||
      Object.getPrototypeOf(value.safety) !== Object.prototype ||
      !Object.hasOwn(value.safety, 'authoritative') ||
      !Object.hasOwn(value.safety, 'physicalActuation') ||
      !Object.hasOwn(value.safety, 'provenanceRequired') ||
      value.safety.authoritative !== false ||
      value.safety.physicalActuation !== false ||
      value.safety.provenanceRequired !== true ||
      !Object.hasOwn(value, 'fingerprint') ||
      typeof value.fingerprint !== 'string' ||
      !/^[a-f0-9]{64}$/.test(value.fingerprint)
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
