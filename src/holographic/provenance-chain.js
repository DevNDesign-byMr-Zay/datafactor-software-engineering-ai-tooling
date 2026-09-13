import { validateHolographicEvidenceEnvelope } from './evidence-envelope.js';
import { verifyHolographicSceneFingerprint } from './scene-fingerprint.js';

function text(value, name) {
  if (typeof value !== 'string' || !value.trim())
    throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
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
  const identityMatches =
    envelope.snapshotId === text(snapshotId, 'snapshotId') &&
    envelope.sceneId === text(sceneId, 'sceneId') &&
    envelope.provenanceRef === text(provenanceRef, 'provenanceRef');
  if (!identityMatches) return false;
  if (scene != null || sceneFingerprint != null) {
    if (
      scene == null ||
      typeof sceneFingerprint !== 'string' ||
      !verifyHolographicSceneFingerprint(scene, sceneFingerprint)
    )
      return false;
    if (
      scene.sceneId !== text(sceneId, 'sceneId') ||
      scene.snapshotId !== text(snapshotId, 'snapshotId')
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
