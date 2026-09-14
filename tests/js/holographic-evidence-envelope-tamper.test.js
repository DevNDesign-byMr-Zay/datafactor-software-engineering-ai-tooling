import test from 'node:test';
import assert from 'node:assert/strict';
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

  assert.equal(validateHolographicEvidenceEnvelope(envelope), true);
});

test('holographic evidence envelope rejects payload, identity, and safety tampering', () => {
  const envelope = buildHolographicEvidenceEnvelope({
    snapshotId: 'snapshot-1',
    sceneId: 'scene-1',
    provenanceRef: 'provenance-1',
  });

  assert.equal(validateHolographicEvidenceEnvelope({ ...envelope, payload: { changed: true } }), false);
  assert.equal(validateHolographicEvidenceEnvelope({ ...envelope, sceneId: 'scene-2' }), false);
  assert.equal(validateHolographicEvidenceEnvelope({ ...envelope, safety: { ...envelope.safety, authoritative: true } }), false);
});
