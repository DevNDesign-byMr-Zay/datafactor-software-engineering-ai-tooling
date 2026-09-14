import { describe, expect, it } from '@jest/globals';
import { evaluateHolographicAcceptance } from '../../src/holographic/acceptance-gate.js';
import { planHolographicScene } from '../../src/holographic/scene-planner.js';
import { fingerprintHolographicScene } from '../../src/holographic/scene-fingerprint.js';

describe('holographic acceptance adversarial cases', () => {
  const planned = planHolographicScene({
    snapshotId: 'snap-1',
    provenanceRef: 'prov-1',
    intent: 'inspect',
    target: 'holo-mat',
    objects: [{ id: 'node-1', label: 'Load', x: 1, y: 2, z: 3 }],
  });
  const scene = { ...planned.scene, snapshotId: 'snap-1' };
  const fingerprint = fingerprintHolographicScene(scene);
  const envelope = planned.evidence;

  it('rejects a changed scene with the original fingerprint', () => {
    const changed = { ...scene, nodes: [{ ...scene.nodes[0], position: { ...scene.nodes[0].position, z: 99 } }] };
    const result = evaluateHolographicAcceptance({
      envelope,
      scene: changed,
      sceneFingerprint: fingerprint,
      snapshotId: 'snap-1',
      sceneId: scene.sceneId,
      provenanceRef: 'prov-1',
    });
    expect(result.accepted).toBe(false);
    expect(result.fingerprintValid).toBe(false);
  });

  it('rejects an authoritative scene boundary', () => {
    const unsafe = { ...scene, safety: { authoritative: true, physicalActuation: false } };
    const result = evaluateHolographicAcceptance({
      envelope,
      scene: unsafe,
      sceneFingerprint: fingerprint,
      snapshotId: 'snap-1',
      sceneId: scene.sceneId,
      provenanceRef: 'prov-1',
    });
    expect(result.accepted).toBe(false);
    expect(result.safetyValid).toBe(false);
  });
});
