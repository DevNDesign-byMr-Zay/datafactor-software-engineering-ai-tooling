import { verifyHolographicSceneFingerprint } from './scene-fingerprint.js';
import { validateHolographicProvenanceBinding } from './provenance-chain.js';

export function verifyHolographicEvidence({
  envelope,
  scene,
  fingerprint,
  snapshotId,
  sceneId,
  provenanceRef,
} = {}) {
  const binding = validateHolographicProvenanceBinding({
    envelope,
    snapshotId,
    sceneId,
    provenanceRef,
    scene,
    sceneFingerprint: fingerprint,
  });
  const sceneFingerprintValid = verifyHolographicSceneFingerprint(scene, fingerprint);
  return Object.freeze({
    valid: binding && sceneFingerprintValid,
    bindingValid: binding,
    sceneFingerprintValid,
    safety: Object.freeze({ advisoryOnly: true, authoritative: false, physicalActuation: false }),
  });
}
