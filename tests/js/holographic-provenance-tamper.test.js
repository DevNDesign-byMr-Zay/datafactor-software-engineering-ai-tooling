import { describe, expect, it } from 'vitest';
import { buildHolographicEvidenceEnvelope } from '../../src/holographic/evidence-envelope.js';
import { fingerprintHolographicScene } from '../../src/holographic/scene-fingerprint.js';
import { evaluateHolographicAcceptance } from '../../src/holographic/acceptance-gate.js';

describe('holographic provenance tamper boundary', () => {
  const scene = {
    sceneId: 'scene-1',
    snapshotId: 'snapshot-1',
    objects: [{ id: 'node-1', x: 1, y: 2, z: 3 }],
    safety: { authoritative: false, physicalActuation: false },
  };

  it('rejects a valid envelope presented under a different provenance reference', () => {
    const envelope = buildHolographicEvidenceEnvelope({
      snapshotId: 'snapshot-1',
      sceneId: 'scene-1',
      provenanceRef: 'prov-1',
      evidence: { source: 'test' },
    });
    const fingerprint = fingerprintHolographicScene(scene);
    const result = evaluateHolographicAcceptance({
      envelope,
      scene,
      sceneFingerprint: fingerprint,
      snapshotId: 'snapshot-1',
      sceneId: 'scene-1',
      provenanceRef: 'prov-swapped',
    });
    expect(result.accepted).toBe(false);
    expect(result.provenanceValid).toBe(false);
  });
});
