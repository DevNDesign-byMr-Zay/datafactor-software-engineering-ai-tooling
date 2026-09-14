import { describe, expect, test } from '@jest/globals';
import { planHolographicScene } from '../../src/holographic/scene-planner.js';
import { validateHolographicEvidenceEnvelope } from '../../src/holographic/evidence-envelope.js';

describe('holographic scene planner', () => {
  test('creates deterministic spatial nodes and signed evidence', () => {
    const result = planHolographicScene({
      snapshotId: 'snapshot-001',
      provenanceRef: 'receipt-001',
      intent: 'Show renewable flow',
      target: 'holo-mat',
      depthScale: 2,
      objects: [{ id: 'solar-1', kind: 'generation', x: 1, y: 2, z: 3, emphasis: true }],
      alerts: ['Battery reserve is low'],
    });

    expect(result.scene.sceneId).toBe('scene-snapshot-001');
    expect(result.scene.snapshotId).toBe('snapshot-001');
    expect(result.evidence.snapshotId).toBe(result.scene.snapshotId);
    expect(result.scene.nodes[0].position).toEqual({ x: 1, y: 2, z: 6 });
    expect(result.scene.safety.physicalActuation).toBe(false);
    expect(validateHolographicEvidenceEnvelope(result.evidence)).toBe(true);
  });

  test('rejects unsupported renderer targets', () => {
    expect(() =>
      planHolographicScene({
        snapshotId: 'snapshot-001',
        provenanceRef: 'receipt-001',
        intent: 'Show grid',
        target: 'laser-wall',
      }),
    ).toThrow('unsupported holographic target');
  });

  test('rejects unsafe depth scale', () => {
    expect(() =>
      planHolographicScene({
        snapshotId: 'snapshot-001',
        provenanceRef: 'receipt-001',
        intent: 'Show grid',
        depthScale: 0,
      }),
    ).toThrow('depthScale must be greater than zero');
  });

  test('rejects malformed spatial nodes', () => {
    expect(() =>
      planHolographicScene({
        snapshotId: 'snapshot-001',
        provenanceRef: 'receipt-001',
        intent: 'Show grid',
        objects: [{ id: 'bad', x: Number.NaN }],
      }),
    ).toThrow('objects[0].x must be finite');
  });
});
