import { expect, test } from '@jest/globals';
import { planHolographicScene } from '../../src/holographic/scene-planner.js';
import { createValidatedHolographicSceneHandoff } from '../../src/holographic/validated-scene-handoff.js';

function fixture() {
  return planHolographicScene({
    snapshotId: 'snapshot-handoff',
    provenanceRef: 'prov-handoff',
    intent: 'inspect topology',
    target: 'web-dashboard',
    objects: [{ id: 'node-1', kind: 'bus', x: 1, y: 2, z: 3 }],
  });
}

test('creates a validated advisory scene handoff from the public API boundary', () => {
  const planned = fixture();
  const handoff = createValidatedHolographicSceneHandoff({
    envelope: planned.evidence,
    scene: planned.scene,
    snapshotId: 'snapshot-handoff',
    sceneId: planned.scene.sceneId,
    provenanceRef: 'prov-handoff',
  });

  expect(handoff.sceneFingerprint).toMatch(/^[a-f0-9]{64}$/);
  expect(handoff.acceptance.accepted).toBe(true);
  expect(handoff.safety).toEqual({ authoritative: false, physicalActuation: false, advisoryOnly: true });
});

test('fails closed when the provenance reference is swapped', () => {
  const planned = fixture();
  expect(() => createValidatedHolographicSceneHandoff({
    envelope: planned.evidence,
    scene: planned.scene,
    snapshotId: 'snapshot-handoff',
    sceneId: planned.scene.sceneId,
    provenanceRef: 'prov-swapped',
  })).toThrow(/acceptance gate/);
});
