import { createHash } from 'node:crypto';
import { evaluateHolographicAcceptance } from './acceptance-gate.js';
import { fingerprintHolographicScene } from './scene-fingerprint.js';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

function fingerprintHandoff(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value)), 'utf8').digest('hex');
}

/** Build the final advisory handoff only after provenance, fingerprint, and safety checks pass. */
export function createValidatedHolographicSceneHandoff({ envelope, scene, snapshotId, sceneId, provenanceRef } = {}) {
  const sceneFingerprint = fingerprintHolographicScene(scene);
  const acceptance = evaluateHolographicAcceptance({ envelope, scene, sceneFingerprint, snapshotId, sceneId, provenanceRef });
  if (!acceptance.accepted) throw new TypeError('holographic scene failed acceptance gate');
  const body = {
    scene,
    sceneFingerprint,
    acceptance,
    safety: { authoritative: false, physicalActuation: false, advisoryOnly: true },
  };
  return Object.freeze({ ...body, handoffFingerprint: fingerprintHandoff(body), safety: Object.freeze(body.safety) });
}

export function verifyValidatedHolographicSceneHandoff(handoff) {
  if (!handoff || typeof handoff !== 'object' || typeof handoff.handoffFingerprint !== 'string') return false;
  const { handoffFingerprint: _fingerprint, ...body } = handoff;
  return /^[a-f0-9]{64}$/.test(handoff.handoffFingerprint) && handoff.handoffFingerprint === fingerprintHandoff(body);
}
