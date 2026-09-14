import { validateHolographicProvenanceBinding } from './provenance-chain.js';
import { verifyHolographicSceneFingerprint } from './scene-fingerprint.js';

export function evaluateHolographicAcceptance({
  envelope,
  scene,
  sceneFingerprint,
  snapshotId,
  sceneId,
  provenanceRef,
} = {}) {
  const provenanceValid = validateHolographicProvenanceBinding({
    envelope,
    snapshotId,
    sceneId,
    provenanceRef,
    scene,
    sceneFingerprint,
  });
  const fingerprintValid = verifyHolographicSceneFingerprint(scene, sceneFingerprint);
  const safety = scene?.safety ?? scene?.rendererContract ?? {};
  const safetyValid =
    safety.authoritative === false &&
    (safety.physicalActuation === false || safety.physicalActuation == null) &&
    (safety.actuatesHardware === false || safety.actuatesHardware == null);
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
