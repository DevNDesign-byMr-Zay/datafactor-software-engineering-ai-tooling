import { expect, test } from '@jest/globals';
import {
  buildHolographicEvidenceEnvelope,
  validateHolographicEvidenceEnvelope,
} from '../../src/holographic/evidence-envelope.js';

test('holographic evidence envelope validates its fingerprint', () => {
  const envelope = buildHolographicEvidenceEnvelope({
    snapshotId: 'snapshot-1',
    sceneId: 'scene-1',
    provenanceRef: 'provenance-1',
    target: 'volumetric-3d',
    payload: { nodes: [{ id: 'node-1', x: 1, y: 2, z: 3 }] },
  });

  expect(validateHolographicEvidenceEnvelope(envelope)).toBe(true);
});

test('holographic evidence envelope rejects payload, identity, and safety tampering', () => {
  const envelope = buildHolographicEvidenceEnvelope({
    snapshotId: 'snapshot-1',
    sceneId: 'scene-1',
    provenanceRef: 'provenance-1',
  });

  expect(
    validateHolographicEvidenceEnvelope({ ...envelope, payload: { changed: true } }),
  ).toBe(false);
  expect(validateHolographicEvidenceEnvelope({ ...envelope, sceneId: 'scene-2' })).toBe(false);
  expect(
    validateHolographicEvidenceEnvelope({
      ...envelope,
      safety: { ...envelope.safety, authoritative: true },
    }),
  ).toBe(false);
});
