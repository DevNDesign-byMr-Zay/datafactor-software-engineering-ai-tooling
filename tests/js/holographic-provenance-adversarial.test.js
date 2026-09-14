import { describe, expect, it } from 'vitest';
import { planHolographicScene } from '../../src/holographic/scene-planner.js';
import { fingerprintHolographicScene } from '../../src/holographic/scene-fingerprint.js';
import { buildHolographicEvidenceEnvelope } from '../../src/holographic/evidence-envelope.js';
import { evaluateHolographicAcceptance } from '../../src/holographic/acceptance-gate.js';

describe('holographic provenance adversarial boundary', () => {
  it('rejects a valid scene when provenance identity is swapped', () => {
    const scene = planHolographicScene({
      snapshotId: 'snap-1',
      provenanceRef: 'prov-1',
      intent: 'inspect',
      target: 'web-dashboard',
      objects: [{ id: 'node-1', text: 'Node', x: 0, y: 0, z: 0 }],
    });
    const envelope = buildHolographicEvidenceEnvelope({
      snapshotId: 'snap-1',
      provenanceRef: 'prov-1',
      sceneId: scene.sceneId,
      intent: 'inspect',
    });
    const fingerprint = fingerprintHolographicScene(scene);
    expect(evaluateHolographicAcceptance({
      envelope,
      scene,
      sceneFingerprint: fingerprint,
      snapshotId: 'snap-1',
      sceneId: scene.sceneId,
      provenanceRef: 'prov-swapped',
    }).accepted).toBe(false);
  });
});
