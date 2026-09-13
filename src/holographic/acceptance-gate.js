import { validateHolographicProvenanceBinding } from './provenance-chain.js';
import { verifyHolographicSceneFingerprint } from './scene-fingerprint.js';

export function evaluateHolographicAcceptance({ envelope, scene, sceneFingerprint, snapshotId, sceneId, provenanceRef } = {}) {
  const provenanceValid = validateHolographicProvenanceBinding({ envelope, snapshotId, sceneId, provenanceRef, scene, sceneFingerprint });
  const fingerprintValid = verifyHolographicSceneFingerprint(scene, sceneFingerprint);
  const safetyValid = scene?.authoritative === false || scene?.rendererContract?.authoritativeSource != null;
  return Object.freeze({
    accepted: provenanceValid && fingerprintValid && safetyValid,
    provenanceValid,
    fingerprintValid,
    safetyValid,
    authoritative: false,
    physicalActuation: false,
    advisoryOnly: true,
  });
}
