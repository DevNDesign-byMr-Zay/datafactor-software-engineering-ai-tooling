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

  test('freezes nested scene state behind the evidence fingerprint', () => {
    const result = planHolographicScene({
      snapshotId: 'snapshot-001',
      provenanceRef: 'receipt-001',
      intent: 'Show renewable flow',
      objects: [{ id: 'solar-1', x: 1, y: 2, z: 3 }],
      alerts: ['Battery reserve is low'],
    });
    const fingerprint = result.evidence.fingerprint;

    expect(Object.isFrozen(result.scene)).toBe(true);
    expect(Object.isFrozen(result.scene.nodes)).toBe(true);
    expect(Object.isFrozen(result.scene.nodes[0])).toBe(true);
    expect(Object.isFrozen(result.scene.nodes[0].position)).toBe(true);
    expect(Object.isFrozen(result.scene.alerts)).toBe(true);
    expect(Object.isFrozen(result.scene.safety)).toBe(true);
    expect(() => {
      result.scene.nodes[0].position.x = 99;
    }).toThrow(TypeError);
    expect(result.evidence.fingerprint).toBe(fingerprint);
    expect(validateHolographicEvidenceEnvelope(result.evidence)).toBe(true);
  });


  test('defensively snapshots and recursively freezes planning constraints and animation', () => {
    const constraints = {
      hard: [{ type: 'bounds', limits: { minX: 0, maxX: 100 } }],
      soft: [{ type: 'balance', weight: 0.5 }],
    };
    const animation = {
      durationMs: 900,
      keyframes: [{ at: 0, opacity: 0 }, { at: 1, opacity: 1 }],
    };

    const result = planHolographicScene({
      snapshotId: 'snapshot-planning-evidence',
      provenanceRef: 'receipt-planning-evidence',
      intent: 'Preview constrained animation',
      constraints,
      animation,
    });
    const fingerprint = result.evidence.fingerprint;

    constraints.hard[0].limits.maxX = 999;
    animation.keyframes[0].opacity = 1;

    expect(result.scene.constraints.hard[0].limits.maxX).toBe(100);
    expect(result.scene.animation.keyframes[0].opacity).toBe(0);
    expect(Object.isFrozen(result.scene.constraints)).toBe(true);
    expect(Object.isFrozen(result.scene.constraints.hard)).toBe(true);
    expect(Object.isFrozen(result.scene.constraints.hard[0].limits)).toBe(true);
    expect(Object.isFrozen(result.scene.animation)).toBe(true);
    expect(Object.isFrozen(result.scene.animation.keyframes[0])).toBe(true);
    expect(result.evidence.fingerprint).toBe(fingerprint);
    expect(validateHolographicEvidenceEnvelope(result.evidence)).toBe(true);
  });

  test('rejects accessor-backed planning evidence without executing getters', () => {
    let reads = 0;
    const constraints = {};
    Object.defineProperty(constraints, 'hard', {
      enumerable: true,
      get() {
        reads += 1;
        return [];
      },
    });

    expect(() =>
      planHolographicScene({
        snapshotId: 'snapshot-accessor',
        provenanceRef: 'receipt-accessor',
        intent: 'Reject deceptive planning evidence',
        constraints,
      }),
    ).toThrow(/constraints\.hard must be enumerable data/);
    expect(reads).toBe(0);
  });

  test('rejects non-finite, decorated, sparse, and circular planning evidence', () => {
    expect(() =>
      planHolographicScene({
        snapshotId: 'snapshot-non-finite',
        provenanceRef: 'receipt-non-finite',
        intent: 'Reject invalid numeric evidence',
        animation: { durationMs: Number.NaN },
      }),
    ).toThrow(/animation\.durationMs must be finite/);

    const decorated = [];
    decorated.extra = true;
    expect(() =>
      planHolographicScene({
        snapshotId: 'snapshot-decorated',
        provenanceRef: 'receipt-decorated',
        intent: 'Reject decorated arrays',
        constraints: { hard: decorated },
      }),
    ).toThrow(/arrays must not contain extra properties/);

    const sparse = new Array(1);
    expect(() =>
      planHolographicScene({
        snapshotId: 'snapshot-sparse',
        provenanceRef: 'receipt-sparse',
        intent: 'Reject sparse arrays',
        animation: { keyframes: sparse },
      }),
    ).toThrow(/must not contain sparse arrays/);

    const circular = {};
    circular.self = circular;
    expect(() =>
      planHolographicScene({
        snapshotId: 'snapshot-circular',
        provenanceRef: 'receipt-circular',
        intent: 'Reject circular evidence',
        constraints: circular,
      }),
    ).toThrow(/must not contain circular references/);
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
