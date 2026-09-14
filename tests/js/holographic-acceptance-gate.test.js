import { expect, test } from '@jest/globals';
import { planHolographicScene } from '../../src/holographic/scene-planner.js';
import { fingerprintHolographicScene } from '../../src/holographic/scene-fingerprint.js';
import { evaluateHolographicAcceptance } from '../../src/holographic/acceptance-gate.js';

test('acceptance gate requires provenance, fingerprint, and non-actuating safety', () => {
  const planned = planHolographicScene({
    snapshotId: 'snapshot-1',
    provenanceRef: 'prov-1',
    intent: 'inspect topology',
    target: 'web-dashboard',
    objects: [{ id: 'node-1', kind: 'bus', x: 1, y: 2, z: 3 }],
  });
  const scene = { ...planned.scene, snapshotId: 'snapshot-1' };
  const sceneFingerprint = fingerprintHolographicScene(scene);
  const accepted = evaluateHolographicAcceptance({
    envelope: planned.evidence,
    scene,
    sceneFingerprint,
    snapshotId: 'snapshot-1',
    sceneId: scene.sceneId,
    provenanceRef: 'prov-1',
  });
  expect(accepted.accepted).toBe(true);
  expect(accepted.safetyValid).toBe(true);
  expect(accepted.physicalActuation).toBe(false);
});

test('acceptance gate rejects an authoritative scene', () => {
  const planned = planHolographicScene({
    snapshotId: 'snapshot-2',
    provenanceRef: 'prov-2',
    intent: 'inspect topology',
  });
  const scene = {
    ...planned.scene,
    snapshotId: 'snapshot-2',
    safety: { ...planned.scene.safety, authoritative: true },
  };
  const accepted = evaluateHolographicAcceptance({
    envelope: planned.evidence,
    scene,
    sceneFingerprint: fingerprintHolographicScene(scene),
    snapshotId: 'snapshot-2',
    sceneId: scene.sceneId,
    provenanceRef: 'prov-2',
  });
  expect(accepted.accepted).toBe(false);
  expect(accepted.safetyValid).toBe(false);
});
