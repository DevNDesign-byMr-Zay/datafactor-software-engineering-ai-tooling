import { evaluateHolographicAcceptance } from './acceptance-gate.js';
import { fingerprintHolographicScene } from './scene-fingerprint.js';

function snapshot(value) {
  if (Array.isArray(value)) return value.map(snapshot);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, snapshot(child)]));
  }
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

/** Build the final advisory handoff only after provenance, fingerprint, and safety checks pass. */
export function createValidatedHolographicSceneHandoff({
  envelope,
  scene,
  snapshotId,
  sceneId,
  provenanceRef,
} = {}) {
  const capturedScene = deepFreeze(snapshot(scene));
  const sceneFingerprint = fingerprintHolographicScene(capturedScene);
  const acceptance = evaluateHolographicAcceptance({
    envelope,
    scene: capturedScene,
    sceneFingerprint,
    snapshotId,
    sceneId,
    provenanceRef,
  });
  if (!acceptance.accepted) throw new TypeError('holographic scene failed acceptance gate');
  return Object.freeze({
    scene: capturedScene,
    sceneFingerprint,
    acceptance,
    safety: Object.freeze({
      authoritative: false,
      physicalActuation: false,
      advisoryOnly: true,
    }),
  });
}
