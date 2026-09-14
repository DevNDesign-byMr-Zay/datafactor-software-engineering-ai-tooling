import { describe, expect, it } from '@jest/globals';
import { planHolographicScene } from '../../src/holographic/scene-planner.js';
import { fingerprintHolographicScene } from '../../src/holographic/scene-fingerprint.js';
import { evaluateHolographicAcceptance } from '../../src/holographic/acceptance-gate.js';

describe('holographic provenance adversarial boundary', () => {
  it('rejects a valid scene when provenance identity is swapped', () => {
    const planned = planHolographicScene({
      snapshotId: 'snap-1',
      provenanceRef: 'prov-1',
      intent: 'inspect',
      target: 'web-dashboard',
      objects: [{ id: 'node-1', text: 'Node', x: 0, y: 0, z: 0 }],
    });
    const scene = { ...planned.scene, snapshotId: 'snap-1' };
    const fingerprint = fingerprintHolographicScene(scene);
    expect(
      evaluateHolographicAcceptance({
        envelope: planned.evidence,
        scene,
        sceneFingerprint: fingerprint,
        snapshotId: 'snap-1',
        sceneId: scene.sceneId,
        provenanceRef: 'prov-swapped',
      }).accepted,
    ).toBe(false);
  });
});
