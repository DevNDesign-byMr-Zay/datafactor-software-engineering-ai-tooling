import test from 'node:test';
import assert from 'node:assert/strict';
import { planHolographicScene } from '../src/holographic/scene-planner.js';
import { buildHolographicEvidenceEnvelope } from '../src/holographic/evidence-envelope.js';
import { createValidatedHolographicSceneHandoff, verifyValidatedHolographicSceneHandoff } from '../src/holographic/validated-scene-handoff.js';

test('validated holographic handoff has a stable integrity identity', () => {
  const snapshotId = 'handoff-fingerprint-snapshot';
  const sceneId = 'handoff-fingerprint-scene';
  const provenanceRef = 'provenance:handoff-fingerprint';
  const scene = planHolographicScene({ snapshotId, provenanceRef, intent: 'inspect', target: 'volumetric-3d', objects: [{ id: 'asset-1', text: 'Solar', x: 1, y: 2, z: 3 }] });
  const envelope = buildHolographicEvidenceEnvelope({ snapshotId, sceneId, provenanceRef, target: 'volumetric-3d', payload: scene });
  const handoff = createValidatedHolographicSceneHandoff({ envelope, scene, snapshotId, sceneId, provenanceRef });
  assert.match(handoff.handoffFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(verifyValidatedHolographicSceneHandoff(handoff), true);
});

test('modified validated handoff is rejected', () => {
  const snapshotId = 'handoff-tamper-snapshot';
  const sceneId = 'handoff-tamper-scene';
  const provenanceRef = 'provenance:handoff-tamper';
  const scene = planHolographicScene({ snapshotId, provenanceRef, intent: 'inspect', target: 'holo-mat', objects: [{ id: 'asset-1', text: 'Load', x: 1, y: 1, z: 1 }] });
  const envelope = buildHolographicEvidenceEnvelope({ snapshotId, sceneId, provenanceRef, target: 'holo-mat', payload: scene });
  const handoff = createValidatedHolographicSceneHandoff({ envelope, scene, snapshotId, sceneId, provenanceRef });
  assert.equal(verifyValidatedHolographicSceneHandoff({ ...handoff, sceneFingerprint: '0'.repeat(64) }), false);
});
