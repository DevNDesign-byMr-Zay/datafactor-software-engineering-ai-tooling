import { describe, expect, test } from 'vitest';
import { buildHolographicEvidenceEnvelope } from '../../src/holographic/evidence-envelope.js';
import {
  createHolographicProvenanceBinding,
  validateHolographicProvenanceBinding,
} from '../../src/holographic/provenance-chain.js';
import { fingerprintHolographicScene } from '../../src/holographic/scene-fingerprint.js';

describe('holographic provenance binding', () => {
  const input = {
    snapshotId: 'snapshot-001',
    sceneId: 'scene-001',
    provenanceRef: 'experiment-001',
  };
  const scene = {
    sceneId: 'scene-001',
    snapshotId: 'snapshot-001',
    layers: { topology: true },
    nodes: [{ id: 'node-1', position: { x: 1, y: 2, z: 3 } }],
  };

  test('binds a valid evidence envelope to its source identities', () => {
    const envelope = buildHolographicEvidenceEnvelope({
      ...input,
      target: 'holo-mat',
      payload: { nodeCount: 3 },
    });
    const binding = createHolographicProvenanceBinding({
      ...input,
      envelope,
      scene,
      sceneFingerprint: fingerprintHolographicScene(scene),
    });
    expect(binding.envelopeFingerprint).toBe(envelope.fingerprint);
    expect(binding.sceneFingerprint).toBe(fingerprintHolographicScene(scene));
    expect(binding.authoritative).toBe(false);
    expect(binding.physicalActuation).toBe(false);
  });

  test('rejects an envelope bound to another snapshot or scene', () => {
    const envelope = buildHolographicEvidenceEnvelope({ ...input, target: 'projector' });
    expect(
      validateHolographicProvenanceBinding({ envelope, ...input, snapshotId: 'snapshot-other' }),
    ).toBe(false);
    expect(
      validateHolographicProvenanceBinding({ envelope, ...input, sceneId: 'scene-other' }),
    ).toBe(false);
  });

  test('rejects a tampered scene fingerprint or cross-identity scene', () => {
    const envelope = buildHolographicEvidenceEnvelope({ ...input, target: 'holo-mat' });
    const fingerprint = fingerprintHolographicScene(scene);
    expect(
      validateHolographicProvenanceBinding({
        envelope,
        ...input,
        scene,
        sceneFingerprint: `${fingerprint.slice(0, -1)}0`,
      }),
    ).toBe(false);
    expect(
      validateHolographicProvenanceBinding({
        envelope,
        ...input,
        scene: { ...scene, sceneId: 'scene-other' },
        sceneFingerprint: fingerprint,
      }),
    ).toBe(false);
  });
});
