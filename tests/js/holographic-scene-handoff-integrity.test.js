import { expect, test } from '@jest/globals';
import { planHolographicScene } from '../../src/holographic/scene-planner.js';
import { fingerprintHolographicScene } from '../../src/holographic/scene-fingerprint.js';
import { verifyHolographicEvidence } from '../../src/holographic/provenance-chain-verifier.js';
import {
  createValidatedHolographicSceneHandoff,
  verifyValidatedHolographicSceneHandoff,
} from '../../src/holographic/validated-scene-handoff.js';

test('combined evidence verification rejects a valid fingerprint from another scene identity', () => {
  const acceptedPlan = planHolographicScene({
    snapshotId: 'snapshot-binding-a',
    provenanceRef: 'prov-binding-a',
    intent: 'inspect accepted topology',
    objects: [{ id: 'node-a', x: 1, y: 2, z: 3 }],
  });
  const otherPlan = planHolographicScene({
    snapshotId: 'snapshot-binding-b',
    provenanceRef: 'prov-binding-b',
    intent: 'inspect other topology',
    objects: [{ id: 'node-b', x: 4, y: 5, z: 6 }],
  });

  const result = verifyHolographicEvidence({
    envelope: acceptedPlan.evidence,
    scene: otherPlan.scene,
    fingerprint: fingerprintHolographicScene(otherPlan.scene),
    snapshotId: acceptedPlan.scene.snapshotId,
    sceneId: acceptedPlan.scene.sceneId,
    provenanceRef: 'prov-binding-a',
  });

  expect(result.sceneFingerprintValid).toBe(true);
  expect(result.bindingValid).toBe(false);
  expect(result.valid).toBe(false);
});

test('validated handoff preserves the planner-frozen source and its handoff fingerprint', () => {
  const planned = planHolographicScene({
    snapshotId: 'snapshot-handoff-current',
    provenanceRef: 'prov-handoff-current',
    intent: 'inspect immutable handoff',
    objects: [{ id: 'node-1', x: 1, y: 2, z: 3 }],
  });
  const scene = planned.scene;
  const handoff = createValidatedHolographicSceneHandoff({
    envelope: planned.evidence,
    scene,
    snapshotId: scene.snapshotId,
    sceneId: scene.sceneId,
    provenanceRef: 'prov-handoff-current',
  });
  const handoffFingerprint = handoff.handoffFingerprint;
  const sceneFingerprint = handoff.sceneFingerprint;

  expect(handoff.acceptance.accepted).toBe(true);
  expect(Object.isFrozen(scene)).toBe(true);
  expect(Object.isFrozen(scene.nodes[0].position)).toBe(true);
  expect(Object.isFrozen(scene.safety)).toBe(true);
  expect(Object.isFrozen(handoff.scene)).toBe(true);
  expect(Object.isFrozen(handoff.scene.nodes)).toBe(true);
  expect(Object.isFrozen(handoff.scene.nodes[0].position)).toBe(true);
  expect(Object.isFrozen(handoff.scene.safety)).toBe(true);

  expect(() => {
    scene.nodes[0].position.x = 99;
  }).toThrow(TypeError);
  expect(() => {
    scene.safety.authoritative = true;
  }).toThrow(TypeError);

  expect(handoff.scene.nodes[0].position.x).toBe(1);
  expect(handoff.scene.safety.authoritative).toBe(false);
  expect(handoff.sceneFingerprint).toBe(sceneFingerprint);
  expect(handoff.handoffFingerprint).toBe(handoffFingerprint);
  expect(verifyValidatedHolographicSceneHandoff(handoff)).toBe(true);
});
