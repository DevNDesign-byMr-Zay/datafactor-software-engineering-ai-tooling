import { expect, test } from '@jest/globals';
import { planHolographicScene } from '../../src/holographic/scene-planner.js';
import {
  createValidatedHolographicSceneHandoff,
  verifyValidatedHolographicSceneHandoff,
} from '../../src/holographic/validated-scene-handoff.js';

test('validated holographic handoff has a stable integrity identity', () => {
  const snapshotId = 'handoff-fingerprint-snapshot';
  const provenanceRef = 'provenance:handoff-fingerprint';
  const planned = planHolographicScene({
    snapshotId,
    provenanceRef,
    intent: 'inspect',
    target: 'volumetric-3d',
    objects: [{ id: 'asset-1', text: 'Solar', x: 1, y: 2, z: 3 }],
  });
  const handoff = createValidatedHolographicSceneHandoff({
    envelope: planned.evidence,
    scene: planned.scene,
    snapshotId,
    sceneId: planned.scene.sceneId,
    provenanceRef,
  });

  expect(handoff.handoffFingerprint).toMatch(/^[a-f0-9]{64}$/);
  expect(verifyValidatedHolographicSceneHandoff(handoff)).toBe(true);
});

test('modified validated handoff is rejected', () => {
  const snapshotId = 'handoff-tamper-snapshot';
  const provenanceRef = 'provenance:handoff-tamper';
  const planned = planHolographicScene({
    snapshotId,
    provenanceRef,
    intent: 'inspect',
    target: 'holo-mat',
    objects: [{ id: 'asset-1', text: 'Load', x: 1, y: 1, z: 1 }],
  });
  const handoff = createValidatedHolographicSceneHandoff({
    envelope: planned.evidence,
    scene: planned.scene,
    snapshotId,
    sceneId: planned.scene.sceneId,
    provenanceRef,
  });

  expect(verifyValidatedHolographicSceneHandoff({ ...handoff, sceneFingerprint: '0'.repeat(64) })).toBe(false);
});

test('rejects a handoff whose scene changes without changing the embedded scene fingerprint', () => {
  const snapshotId = 'handoff-scene-drift-snapshot';
  const provenanceRef = 'provenance:handoff-scene-drift';
  const planned = planHolographicScene({
    snapshotId,
    provenanceRef,
    intent: 'inspect',
    target: 'web-dashboard',
    objects: [{ id: 'asset-1', text: 'Grid', x: 2, y: 4, z: 1 }],
  });
  const handoff = createValidatedHolographicSceneHandoff({
    envelope: planned.evidence,
    scene: planned.scene,
    snapshotId,
    sceneId: planned.scene.sceneId,
    provenanceRef,
  });
  const changedScene = { ...handoff.scene, nodes: [...handoff.scene.nodes, { id: 'tampered', text: 'drift', x: 0, y: 0, z: 0 }] };

  expect(verifyValidatedHolographicSceneHandoff({ ...handoff, scene: changedScene })).toBe(false);
});
