import { expect, test } from '@jest/globals';
import { buildHolographicEvidenceEnvelope } from '../../src/holographic/evidence-envelope.js';
import { createHolographicProvenanceBinding } from '../../src/holographic/provenance-chain.js';
import { fingerprintHolographicScene } from '../../src/holographic/scene-fingerprint.js';
import { verifyHolographicEvidence } from '../../src/holographic/provenance-chain-verifier.js';

test('verifies scene fingerprint and provenance binding together', () => {
  const scene = {
    sceneVersion: 2,
    sceneId: 'scene-verify',
    snapshotId: 'snapshot-verify',
    nodes: [{ id: 'n1', position: { x: 1, y: 2, z: 3 } }],
  };
  const envelope = buildHolographicEvidenceEnvelope({
    snapshotId: 'snapshot-verify',
    sceneId: scene.sceneId,
    provenanceRef: 'prov-verify',
    payload: { metric: 42 },
  });
  const binding = createHolographicProvenanceBinding({
    envelope,
    snapshotId: 'snapshot-verify',
    sceneId: scene.sceneId,
    provenanceRef: 'prov-verify',
  });
  const fingerprint = fingerprintHolographicScene(scene);
  const result = verifyHolographicEvidence({
    envelope,
    scene,
    fingerprint,
    snapshotId: binding.snapshotId,
    sceneId: binding.sceneId,
    provenanceRef: binding.provenanceRef,
  });
  expect(result.valid).toBe(true);
  expect(result.bindingValid).toBe(true);
  expect(result.sceneFingerprintValid).toBe(true);
  expect(result.safety.physicalActuation).toBe(false);
});

test('rejects a changed scene while preserving provenance validity signal', () => {
  const scene = {
    sceneVersion: 2,
    sceneId: 'scene-change',
    snapshotId: 'snapshot-change',
    nodes: [{ id: 'n1', position: { x: 1, y: 2, z: 3 } }],
  };
  const envelope = buildHolographicEvidenceEnvelope({
    snapshotId: 'snapshot-change',
    sceneId: scene.sceneId,
    provenanceRef: 'prov-change',
    payload: { metric: 42 },
  });
  const binding = createHolographicProvenanceBinding({
    envelope,
    snapshotId: 'snapshot-change',
    sceneId: scene.sceneId,
    provenanceRef: 'prov-change',
  });
  const fingerprint = fingerprintHolographicScene(scene);
  const result = verifyHolographicEvidence({
    envelope,
    scene: { ...scene, nodes: [{ ...scene.nodes[0], position: { x: 9, y: 2, z: 3 } }] },
    fingerprint,
    snapshotId: binding.snapshotId,
    sceneId: binding.sceneId,
    provenanceRef: binding.provenanceRef,
  });
  expect(result.valid).toBe(false);
  expect(result.bindingValid).toBe(true);
  expect(result.sceneFingerprintValid).toBe(false);
});
