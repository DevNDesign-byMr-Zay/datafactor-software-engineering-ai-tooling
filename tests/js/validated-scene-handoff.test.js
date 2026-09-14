import { expect, test } from '@jest/globals';
import { buildHolographicEvidenceEnvelope } from '../../src/holographic/evidence-envelope.js';
import { verifyHolographicSceneFingerprint } from '../../src/holographic/scene-fingerprint.js';
import { createValidatedHolographicSceneHandoff } from '../../src/holographic/validated-scene-handoff.js';

function buildScene() {
  return {
    sceneVersion: 1,
    snapshotId: 'snapshot-handoff-001',
    sceneId: 'scene-handoff-001',
    target: 'web-dashboard',
    nodes: [{ id: 'node-1', position: { x: 1, y: 2, z: 3 } }],
    alerts: [],
    safety: {
      advisoryOnly: true,
      authoritative: false,
      physicalActuation: false,
    },
  };
}

test('captures and freezes scene state behind the validated handoff fingerprint', () => {
  const scene = buildScene();
  const envelope = buildHolographicEvidenceEnvelope({
    snapshotId: scene.snapshotId,
    sceneId: scene.sceneId,
    provenanceRef: 'prov-handoff-001',
    target: scene.target,
    payload: scene,
    advisoryOnly: true,
  });
  const handoff = createValidatedHolographicSceneHandoff({
    envelope,
    scene,
    snapshotId: scene.snapshotId,
    sceneId: scene.sceneId,
    provenanceRef: 'prov-handoff-001',
  });
  const fingerprint = handoff.sceneFingerprint;

  expect(handoff.acceptance.accepted).toBe(true);
  expect(Object.isFrozen(handoff.scene)).toBe(true);
  expect(Object.isFrozen(handoff.scene.nodes)).toBe(true);
  expect(Object.isFrozen(handoff.scene.nodes[0].position)).toBe(true);
  expect(Object.isFrozen(handoff.scene.safety)).toBe(true);

  scene.nodes[0].position.x = 99;
  scene.safety.authoritative = true;

  expect(handoff.scene.nodes[0].position.x).toBe(1);
  expect(handoff.scene.safety.authoritative).toBe(false);
  expect(handoff.sceneFingerprint).toBe(fingerprint);
  expect(verifyHolographicSceneFingerprint(handoff.scene, fingerprint)).toBe(true);
});

test('fails closed when the scene identity does not match the evidence envelope', () => {
  const scene = buildScene();
  const envelope = buildHolographicEvidenceEnvelope({
    snapshotId: scene.snapshotId,
    sceneId: scene.sceneId,
    provenanceRef: 'prov-handoff-002',
    target: scene.target,
    payload: scene,
    advisoryOnly: true,
  });

  expect(() =>
    createValidatedHolographicSceneHandoff({
      envelope,
      scene: { ...scene, snapshotId: 'snapshot-other' },
      snapshotId: scene.snapshotId,
      sceneId: scene.sceneId,
      provenanceRef: 'prov-handoff-002',
    }),
  ).toThrow(/failed acceptance gate/);
});
