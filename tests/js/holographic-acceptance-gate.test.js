import { expect, test } from '@jest/globals';
import { evaluateHolographicAcceptance } from '../../src/holographic/acceptance-gate.js';
import { fingerprintHolographicScene } from '../../src/holographic/scene-fingerprint.js';
import { planHolographicScene } from '../../src/holographic/scene-planner.js';

test('acceptance gate requires provenance, fingerprint, and non-actuating safety', () => {
  const planned = planHolographicScene({
    snapshotId: 'snapshot-1',
    provenanceRef: 'prov-1',
    intent: 'inspect topology',
    target: 'web-dashboard',
    objects: [{ id: 'node-1', kind: 'bus', x: 1, y: 2, z: 3 }],
  });
  const sceneFingerprint = fingerprintHolographicScene(planned.scene);
  const accepted = evaluateHolographicAcceptance({
    envelope: planned.evidence,
    scene: planned.scene,
    sceneFingerprint,
    snapshotId: 'snapshot-1',
    sceneId: planned.scene.sceneId,
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

test('acceptance gate rejects a valid fingerprinted scene from another snapshot', () => {
  const expected = planHolographicScene({
    snapshotId: 'snapshot-expected',
    provenanceRef: 'prov-expected',
    intent: 'inspect topology',
  });
  const other = planHolographicScene({
    snapshotId: 'snapshot-other',
    provenanceRef: 'prov-other',
    intent: 'inspect topology',
  });

  const accepted = evaluateHolographicAcceptance({
    envelope: expected.evidence,
    scene: other.scene,
    sceneFingerprint: fingerprintHolographicScene(other.scene),
    snapshotId: 'snapshot-expected',
    sceneId: expected.scene.sceneId,
    provenanceRef: 'prov-expected',
  });

  expect(accepted.fingerprintValid).toBe(true);
  expect(accepted.provenanceValid).toBe(false);
  expect(accepted.accepted).toBe(false);
});
