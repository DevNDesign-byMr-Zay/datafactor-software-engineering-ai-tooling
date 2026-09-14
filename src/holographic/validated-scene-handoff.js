import { createHash } from 'node:crypto';
import { evaluateHolographicAcceptance } from './acceptance-gate.js';
import { fingerprintHolographicScene } from './scene-fingerprint.js';

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

function fingerprintHandoff(value) {
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)), 'utf8')
    .digest('hex');
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
  const body = {
    scene: capturedScene,
    sceneFingerprint,
    acceptance,
    safety: Object.freeze({ authoritative: false, physicalActuation: false, advisoryOnly: true }),
  };
  return Object.freeze({
    ...body,
    handoffFingerprint: fingerprintHandoff(body),
  });
}

export function verifyValidatedHolographicSceneHandoff(handoff) {
  if (!handoff || typeof handoff !== 'object' || typeof handoff.handoffFingerprint !== 'string')
    return false;
  const body = Object.fromEntries(
    Object.entries(handoff).filter(([key]) => key !== 'handoffFingerprint'),
  );
  return (
    /^[a-f0-9]{64}$/.test(handoff.handoffFingerprint) &&
    handoff.handoffFingerprint === fingerprintHandoff(body)
  );
}
