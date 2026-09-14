import { describe, expect, it } from 'vitest';
import { evaluateHolographicAcceptance } from '../../src/holographic/acceptance-gate.js';
import { planHolographicScene } from '../../src/holographic/scene-planner.js';
import { fingerprintHolographicScene } from '../../src/holographic/scene-fingerprint.js';
import { buildHolographicEvidenceEnvelope } from '../../src/holographic/evidence-envelope.js';

describe('holographic acceptance adversarial cases', () => {
  const scene = planHolographicScene({
    snapshotId: 'snap-1', provenanceRef: 'prov-1', intent: 'inspect', target: 'holo-mat',
    objects: [{ id: 'node-1', label: 'Load', x: 1, y: 2, z: 3 }],
  });
  const fingerprint = fingerprintHolographicScene(scene);
  const envelope = buildHolographicEvidenceEnvelope({
    snapshotId: 'snap-1', provenanceRef: 'prov-1', sceneId: scene.sceneId, evidence: { type: 'scene-plan' },
  });

  it('rejects a changed scene with the original fingerprint', () => {
    const changed = { ...scene, objects: [{ ...scene.objects[0], z: 99 }] };
    const result = evaluateHolographicAcceptance({
      envelope, scene: changed, sceneFingerprint: fingerprint,
      snapshotId: 'snap-1', sceneId: scene.sceneId, provenanceRef: 'prov-1',
    });
    expect(result.accepted).toBe(false);
    expect(result.fingerprintValid).toBe(false);
  });

  it('rejects an authoritative scene boundary', () => {
    const unsafe = { ...scene, safety: { authoritative: true, physicalActuation: false } };
    const result = evaluateHolographicAcceptance({
      envelope, scene: unsafe, sceneFingerprint: fingerprint,
      snapshotId: 'snap-1', sceneId: scene.sceneId, provenanceRef: 'prov-1',
    });
    expect(result.accepted).toBe(false);
    expect(result.safetyValid).toBe(false);
  });
});
