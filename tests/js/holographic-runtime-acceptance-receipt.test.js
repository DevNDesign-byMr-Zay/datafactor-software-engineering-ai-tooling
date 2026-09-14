import { expect, test } from '@jest/globals';
import { planHolographicScene } from '../../src/holographic/scene-planner.js';
import {
  buildHolographicRuntimeAcceptanceReceipt,
  validateHolographicRuntimeAcceptanceReceipt,
} from '../../src/runtime/holographic-runtime-acceptance-receipt.js';

function acceptanceFixture() {
  return {
    accepted: true,
    bootstrap: {
      stage: 'ready',
      readiness: [{ name: 'config', status: 'ready' }],
      failedStep: null,
    },
    release: {
      stage: 'released',
      exitCode: 0,
      service: {
        serviceName: 'holographic-runtime',
        latestReadyRevisionName: 'holographic-runtime-0001',
        traffic: [{ revisionName: 'holographic-runtime-0001', percent: 100 }],
        url: 'https://example.invalid',
      },
    },
  };
}

test('runtime acceptance receipt binds deployment evidence to a safe holographic scene', () => {
  const planned = planHolographicScene({
    snapshotId: 'snapshot-runtime-1',
    provenanceRef: 'prov-runtime-1',
    intent: 'inspect topology',
    target: 'web-dashboard',
    objects: [{ id: 'node-1', kind: 'bus', x: 1, y: 2, z: 3 }],
  });
  const scene = { ...planned.scene, snapshotId: 'snapshot-runtime-1' };
  const receipt = buildHolographicRuntimeAcceptanceReceipt({
    acceptance: acceptanceFixture(),
    serviceName: 'holographic-runtime',
    region: 'us-east1',
    envelope: planned.evidence,
    scene,
    snapshotId: 'snapshot-runtime-1',
    sceneId: scene.sceneId,
    provenanceRef: 'prov-runtime-1',
  });

  expect(validateHolographicRuntimeAcceptanceReceipt(receipt)).toBe(true);
  expect(receipt.holographicAcceptance.accepted).toBe(true);
  expect(receipt.safety.physicalActuation).toBe(false);
});

test('runtime acceptance receipt rejects tampered scene identity', () => {
  const planned = planHolographicScene({
    snapshotId: 'snapshot-runtime-2',
    provenanceRef: 'prov-runtime-2',
    intent: 'inspect topology',
  });
  const scene = { ...planned.scene, snapshotId: 'snapshot-runtime-2' };
  const receipt = buildHolographicRuntimeAcceptanceReceipt({
    acceptance: acceptanceFixture(),
    envelope: planned.evidence,
    scene,
    snapshotId: 'snapshot-runtime-2',
    sceneId: scene.sceneId,
    provenanceRef: 'prov-runtime-2',
  });
  const tampered = { ...receipt, sceneId: 'scene-tampered' };
  expect(validateHolographicRuntimeAcceptanceReceipt(tampered)).toBe(false);
});
