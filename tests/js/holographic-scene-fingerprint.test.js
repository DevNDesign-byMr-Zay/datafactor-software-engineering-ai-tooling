import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fingerprintHolographicScene,
  verifyHolographicSceneFingerprint,
} from '../../src/holographic/scene-fingerprint.js';

test('fingerprint is stable across object key order', () => {
  const a = { sceneId: 's1', nodes: [{ z: 3, x: 1 }] };
  const b = { nodes: [{ x: 1, z: 3 }], sceneId: 's1' };
  const fingerprint = fingerprintHolographicScene(a);
  assert.equal(fingerprintHolographicScene(b), fingerprint);
  assert.equal(verifyHolographicSceneFingerprint(b, fingerprint), true);
});

test('fingerprint detects scene changes', () => {
  const scene = { sceneId: 's1', nodes: [{ x: 1 }] };
  const fingerprint = fingerprintHolographicScene(scene);
  assert.equal(
    verifyHolographicSceneFingerprint(
      { ...scene, sceneId: 's2' },
      fingerprint,
    ),
    false,
  );
});
