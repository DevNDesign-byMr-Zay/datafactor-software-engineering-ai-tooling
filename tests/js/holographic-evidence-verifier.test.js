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
  const fingerprint = fingerprintHolographicScene(scene);
  const binding = createHolographicProvenanceBinding({
    envelope,
    snapshotId: 'snapshot-verify',
    sceneId: scene.sceneId,
    provenanceRef: 'prov-verify',
    scene,
    sceneFingerprint: fingerprint,
  });
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
  expect(Object.isFrozen(result.safety)).toBe(true);
});

test('rejects a changed scene before it can remain provenance-bound', () => {
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
  const fingerprint = fingerprintHolographicScene(scene);
  const changedScene = {
    ...scene,
    nodes: [{ ...scene.nodes[0], position: { x: 9, y: 2, z: 3 } }],
  };
  const result = verifyHolographicEvidence({
    envelope,
    scene: changedScene,
    fingerprint,
    snapshotId: 'snapshot-change',
    sceneId: scene.sceneId,
    provenanceRef: 'prov-change',
  });

  expect(result.valid).toBe(false);
  expect(result.bindingValid).toBe(false);
  expect(result.sceneFingerprintValid).toBe(false);
});

test('rejects a valid scene fingerprint from another envelope identity', () => {
  const envelopeScene = {
    sceneVersion: 2,
    sceneId: 'scene-envelope',
    snapshotId: 'snapshot-envelope',
    nodes: [],
  };
  const otherScene = {
    sceneVersion: 2,
    sceneId: 'scene-other',
    snapshotId: 'snapshot-other',
    nodes: [],
  };
  const envelope = buildHolographicEvidenceEnvelope({
    snapshotId: envelopeScene.snapshotId,
    sceneId: envelopeScene.sceneId,
    provenanceRef: 'prov-envelope',
    payload: { metric: 42 },
  });
  const fingerprint = fingerprintHolographicScene(otherScene);
  const result = verifyHolographicEvidence({
    envelope,
    scene: otherScene,
    fingerprint,
    snapshotId: envelopeScene.snapshotId,
    sceneId: envelopeScene.sceneId,
    provenanceRef: 'prov-envelope',
  });

  expect(result.sceneFingerprintValid).toBe(true);
  expect(result.bindingValid).toBe(false);
  expect(result.valid).toBe(false);
});
