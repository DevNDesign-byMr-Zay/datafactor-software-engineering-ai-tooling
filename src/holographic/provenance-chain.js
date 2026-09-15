import { validateHolographicEvidenceEnvelope } from './evidence-envelope.js';
import { verifyHolographicSceneFingerprint } from './scene-fingerprint.js';

function text(value, name) {
  if (typeof value !== 'string' || !value.trim())
    throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function hasOwnSceneIdentity(scene, snapshotId, sceneId) {
  if (!scene || typeof scene !== 'object' || Array.isArray(scene)) return false;
  const prototype = Object.getPrototypeOf(scene);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return (
    Object.prototype.hasOwnProperty.call(scene, 'sceneId') &&
    Object.prototype.hasOwnProperty.call(scene, 'snapshotId') &&
    scene.sceneId === sceneId &&
    scene.snapshotId === snapshotId
  );
}

/** Bind a holographic evidence envelope to its producing artifact identity. */
export function validateHolographicProvenanceBinding({
  envelope,
  snapshotId,
  sceneId,
  provenanceRef,
  scene = null,
  sceneFingerprint = null,
} = {}) {
  if (!validateHolographicEvidenceEnvelope(envelope)) return false;
  const normalizedSnapshotId = text(snapshotId, 'snapshotId');
  const normalizedSceneId = text(sceneId, 'sceneId');
  const normalizedProvenanceRef = text(provenanceRef, 'provenanceRef');
  const identityMatches =
    envelope.snapshotId === normalizedSnapshotId &&
    envelope.sceneId === normalizedSceneId &&
    envelope.provenanceRef === normalizedProvenanceRef;
  if (!identityMatches) return false;
  if (scene != null || sceneFingerprint != null) {
    if (
      !hasOwnSceneIdentity(scene, normalizedSnapshotId, normalizedSceneId) ||
      typeof sceneFingerprint !== 'string' ||
      !verifyHolographicSceneFingerprint(scene, sceneFingerprint)
    )
      return false;
  }
  return true;
}

export function createHolographicProvenanceBinding({
  envelope,
  snapshotId,
  sceneId,
  provenanceRef,
  scene = null,
  sceneFingerprint = null,
} = {}) {
  if (
    !validateHolographicProvenanceBinding({
      envelope,
      snapshotId,
      sceneId,
      provenanceRef,
      scene,
      sceneFingerprint,
    })
  ) {
    throw new TypeError('holographic evidence does not match the requested provenance binding');
  }
  return Object.freeze({
    envelopeFingerprint: envelope.fingerprint,
    sceneFingerprint: sceneFingerprint ?? null,
    snapshotId: text(snapshotId, 'snapshotId'),
    sceneId: text(sceneId, 'sceneId'),
    provenanceRef: text(provenanceRef, 'provenanceRef'),
    authoritative: false,
    physicalActuation: false,
  });
}
