import { validateHolographicEvidenceEnvelope } from './evidence-envelope.js';

function text(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

/** Bind a holographic evidence envelope to its producing artifact identity. */
export function validateHolographicProvenanceBinding({ envelope, snapshotId, sceneId, provenanceRef } = {}) {
  if (!validateHolographicEvidenceEnvelope(envelope)) return false;
  return envelope.snapshotId === text(snapshotId, 'snapshotId')
    && envelope.sceneId === text(sceneId, 'sceneId')
    && envelope.provenanceRef === text(provenanceRef, 'provenanceRef');
}

export function createHolographicProvenanceBinding({ envelope, snapshotId, sceneId, provenanceRef } = {}) {
  if (!validateHolographicProvenanceBinding({ envelope, snapshotId, sceneId, provenanceRef })) {
    throw new TypeError('holographic evidence does not match the requested provenance binding');
  }
  return Object.freeze({
    envelopeFingerprint: envelope.fingerprint,
    snapshotId: text(snapshotId, 'snapshotId'),
    sceneId: text(sceneId, 'sceneId'),
    provenanceRef: text(provenanceRef, 'provenanceRef'),
    authoritative: false,
    physicalActuation: false,
  });
}
