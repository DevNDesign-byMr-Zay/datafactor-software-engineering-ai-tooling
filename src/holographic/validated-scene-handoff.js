import { createHash } from 'node:crypto';
import { evaluateHolographicAcceptance } from './acceptance-gate.js';
import { validateHolographicEvidenceEnvelope } from './evidence-envelope.js';
import { fingerprintHolographicScene } from './scene-fingerprint.js';
import { validateHolographicProvenanceBinding } from './provenance-chain.js';

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

function fingerprintProvenanceBinding(value) {
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)), 'utf8')
    .digest('hex');
}

function verifyAcceptance(acceptance) {
  if (!acceptance || typeof acceptance !== 'object' || Array.isArray(acceptance)) return false;
  const requiredBooleans = [
    'accepted',
    'provenanceValid',
    'fingerprintValid',
    'safetyValid',
    'authoritative',
    'physicalActuation',
    'advisoryOnly',
  ];
  if (requiredBooleans.some((key) => typeof acceptance[key] !== 'boolean')) return false;
  return (
    acceptance.accepted ===
      (acceptance.provenanceValid && acceptance.fingerprintValid && acceptance.safetyValid) &&
    acceptance.authoritative === false &&
    acceptance.physicalActuation === false &&
    acceptance.advisoryOnly === true
  );
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
  const normalizedSnapshotId = String(snapshotId).trim();
  const normalizedSceneId = String(sceneId).trim();
  const normalizedProvenanceRef = String(provenanceRef).trim();
  const sceneFingerprint = fingerprintHolographicScene(capturedScene);
  const acceptance = evaluateHolographicAcceptance({
    envelope,
    scene: capturedScene,
    sceneFingerprint,
    snapshotId: normalizedSnapshotId,
    sceneId: normalizedSceneId,
    provenanceRef: normalizedProvenanceRef,
  });
  if (!acceptance.accepted) throw new TypeError('holographic scene failed acceptance gate');

  const provenanceBinding = {
    envelopeFingerprint: envelope.fingerprint,
    snapshotId: normalizedSnapshotId,
    sceneId: normalizedSceneId,
    provenanceRef: normalizedProvenanceRef,
  };
  const provenanceCommitment = fingerprintProvenanceBinding(provenanceBinding);
  const body = {
    scene: capturedScene,
    sceneFingerprint,
    acceptance,
    provenanceBinding: Object.freeze(provenanceBinding),
    provenanceCommitment,
    safety: Object.freeze({ authoritative: false, physicalActuation: false, advisoryOnly: true }),
  };
  return Object.freeze({
    ...body,
    handoffFingerprint: fingerprintHandoff(body),
  });
}

/** Verify a handoff structurally; pass the source envelope to re-run the independent provenance gate. */
export function verifyValidatedHolographicSceneHandoff(handoff, { envelope = null } = {}) {
  if (!handoff || typeof handoff !== 'object' || typeof handoff.handoffFingerprint !== 'string')
    return false;
  const body = Object.fromEntries(
    Object.entries(handoff).filter(([key]) => key !== 'handoffFingerprint'),
  );
  if (!/^[a-f0-9]{64}$/.test(handoff.handoffFingerprint)) return false;
  if (!body.scene || typeof body.scene !== 'object' || typeof body.sceneFingerprint !== 'string')
    return false;
  if (!/^[a-f0-9]{64}$/.test(body.sceneFingerprint)) return false;
  if (fingerprintHolographicScene(body.scene) !== body.sceneFingerprint) return false;
  if (!verifyAcceptance(body.acceptance)) return false;

  const binding = body.provenanceBinding;
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) return false;
  if (
    typeof binding.envelopeFingerprint !== 'string' ||
    !/^[a-f0-9]{64}$/.test(binding.envelopeFingerprint)
  )
    return false;
  if (
    typeof binding.snapshotId !== 'string' ||
    typeof binding.sceneId !== 'string' ||
    typeof binding.provenanceRef !== 'string'
  )
    return false;
  if (!body.provenanceCommitment || !/^[a-f0-9]{64}$/.test(body.provenanceCommitment))
    return false;
  if (body.provenanceCommitment !== fingerprintProvenanceBinding(binding)) return false;
  if (body.scene.snapshotId !== binding.snapshotId || body.scene.sceneId !== binding.sceneId)
    return false;
  if (!body.acceptance.provenanceValid) return false;
  if (
    !body.safety ||
    body.safety.authoritative !== false ||
    body.safety.physicalActuation !== false ||
    body.safety.advisoryOnly !== true
  )
    return false;

  if (envelope != null) {
    if (!validateHolographicEvidenceEnvelope(envelope)) return false;
    if (envelope.fingerprint !== binding.envelopeFingerprint) return false;
    if (
      !validateHolographicProvenanceBinding({
        envelope,
        snapshotId: binding.snapshotId,
        sceneId: binding.sceneId,
        provenanceRef: binding.provenanceRef,
        scene: body.scene,
        sceneFingerprint: body.sceneFingerprint,
      })
    )
      return false;
  }

  return handoff.handoffFingerprint === fingerprintHandoff(body);
}
