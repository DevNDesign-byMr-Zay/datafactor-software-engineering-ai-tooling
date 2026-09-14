import { evaluateHolographicAcceptance } from './acceptance-gate.js';
import { fingerprintHolographicScene } from './scene-fingerprint.js';

/** Build the final advisory handoff only after provenance, fingerprint, and safety checks pass. */
export function createValidatedHolographicSceneHandoff({
  envelope,
  scene,
  snapshotId,
  sceneId,
  provenanceRef,
} = {}) {
  const sceneFingerprint = fingerprintHolographicScene(scene);
  const acceptance = evaluateHolographicAcceptance({
    envelope,
    scene,
    sceneFingerprint,
    snapshotId,
    sceneId,
    provenanceRef,
  });
  if (!acceptance.accepted) throw new TypeError('holographic scene failed acceptance gate');
  return Object.freeze({
    scene,
    sceneFingerprint,
    acceptance,
    safety: Object.freeze({ authoritative: false, physicalActuation: false, advisoryOnly: true }),
  });
}
