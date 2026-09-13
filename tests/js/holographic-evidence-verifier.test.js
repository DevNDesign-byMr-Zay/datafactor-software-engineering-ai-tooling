import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHolographicEvidenceEnvelope } from '../../src/holographic/evidence-envelope.js';
import { createHolographicProvenanceBinding } from '../../src/holographic/provenance-chain.js';
import { fingerprintHolographicScene } from '../../src/holographic/scene-fingerprint.js';
import { verifyHolographicEvidence } from '../../src/holographic/provenance-chain-verifier.js';

test('verifies scene fingerprint and provenance binding together', () => {
  const scene = { sceneVersion: 2, sceneId: 'scene-verify', snapshotId: 'snapshot-verify', nodes: [{ id: 'n1', position: { x: 1, y: 2, z: 3 } }] };
  const envelope = buildHolographicEvidenceEnvelope({ snapshotId: 'snapshot-verify', provenanceRef: 'prov-verify', payload: { metric: 42 } });
  const binding = createHolographicProvenanceBinding({ envelope, snapshotId: 'snapshot-verify', sceneId: scene.sceneId, provenanceRef: 'prov-verify' });
  const fingerprint = fingerprintHolographicScene(scene);
  const result = verifyHolographicEvidence({ envelope, scene, fingerprint, snapshotId: binding.snapshotId, sceneId: binding.sceneId, provenanceRef: binding.provenanceRef });
  assert.equal(result.valid, true);
  assert.equal(result.bindingValid, true);
  assert.equal(result.sceneFingerprintValid, true);
  assert.equal(result.safety.physicalActuation, false);
});

test('rejects a changed scene while preserving provenance validity signal', () => {
  const scene = { sceneVersion: 2, sceneId: 'scene-change', snapshotId: 'snapshot-change', nodes: [{ id: 'n1', position: { x: 1, y: 2, z: 3 } }] };
  const envelope = buildHolographicEvidenceEnvelope({ snapshotId: 'snapshot-change', provenanceRef: 'prov-change', payload: { metric: 42 } });
  const binding = createHolographicProvenanceBinding({ envelope, snapshotId: 'snapshot-change', sceneId: scene.sceneId, provenanceRef: 'prov-change' });
  const fingerprint = fingerprintHolographicScene(scene);
  const result = verifyHolographicEvidence({ envelope, scene: { ...scene, nodes: [{ ...scene.nodes[0], position: { x: 9, y: 2, z: 3 } }] }, fingerprint, snapshotId: binding.snapshotId, sceneId: binding.sceneId, provenanceRef: binding.provenanceRef });
  assert.equal(result.valid, false);
  assert.equal(result.bindingValid, true);
  assert.equal(result.sceneFingerprintValid, false);
});
