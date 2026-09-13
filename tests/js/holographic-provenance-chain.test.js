import { describe, expect, test } from 'vitest';
import { buildHolographicEvidenceEnvelope } from '../../src/holographic/evidence-envelope.js';
import { createHolographicProvenanceBinding, validateHolographicProvenanceBinding } from '../../src/holographic/provenance-chain.js';

describe('holographic provenance binding', () => {
  const input = { snapshotId: 'snapshot-001', sceneId: 'scene-001', provenanceRef: 'experiment-001' };

  test('binds a valid evidence envelope to its source identities', () => {
    const envelope = buildHolographicEvidenceEnvelope({ ...input, target: 'holo-mat', payload: { nodeCount: 3 } });
    const binding = createHolographicProvenanceBinding({ envelope, ...input });
    expect(binding.envelopeFingerprint).toBe(envelope.fingerprint);
    expect(binding.authoritative).toBe(false);
    expect(binding.physicalActuation).toBe(false);
  });

  test('rejects an envelope bound to another snapshot or scene', () => {
    const envelope = buildHolographicEvidenceEnvelope({ ...input, target: 'projector' });
    expect(validateHolographicProvenanceBinding({ envelope, ...input, snapshotId: 'snapshot-other' })).toBe(false);
    expect(validateHolographicProvenanceBinding({ envelope, ...input, sceneId: 'scene-other' })).toBe(false);
  });
});
