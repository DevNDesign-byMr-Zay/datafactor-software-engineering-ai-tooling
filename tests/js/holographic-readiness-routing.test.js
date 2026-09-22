import { describe, expect, test } from '@jest/globals';

import { evaluateHolographicReadiness } from '../../src/holographic/readiness-routing.js';
import { planHolographicScene } from '../../src/holographic/scene-planner.js';
import { createValidatedHolographicSceneHandoff } from '../../src/holographic/validated-scene-handoff.js';

function handoff(target = 'holo-mat') {
  const planned = planHolographicScene({
    snapshotId: 'snapshot-routing',
    provenanceRef: 'receipt-routing',
    intent: 'Evaluate device readiness',
    target,
    objects: [{ id: 'asset-1', x: 1, y: 2, z: 3 }],
  });
  return createValidatedHolographicSceneHandoff({
    envelope: planned.evidence,
    scene: planned.scene,
    snapshotId: 'snapshot-routing',
    sceneId: planned.scene.sceneId,
    provenanceRef: 'receipt-routing',
  });
}

describe('advisory multi-device readiness routing', () => {
  test('returns deterministic per-device readiness without selecting a device', () => {
    const accepted = handoff();
    const result = evaluateHolographicReadiness({
      handoff: accepted,
      requiredCapabilities: ['depth', 'selection'],
      devices: [
        { id: 'device-b', target: 'holo-mat', capabilities: ['depth'] },
        { id: 'device-a', target: 'holo-mat', capabilities: ['selection', 'depth'] },
      ],
    });

    expect(result.ready).toBe(true);
    expect(result.routes.map((route) => route.deviceId)).toEqual(['device-a', 'device-b']);
    expect(result.routes[0]).toMatchObject({
      deviceId: 'device-a',
      compatible: true,
      status: 'ready',
      reason: null,
      missingCapabilities: [],
    });
    expect(result.routes[1]).toMatchObject({
      deviceId: 'device-b',
      compatible: false,
      status: 'blocked',
      reason: 'CAPABILITY_GAP',
      missingCapabilities: ['selection'],
    });
    expect(result.safety).toEqual({
      advisoryOnly: true,
      authoritative: false,
      physicalActuation: false,
      automaticSelection: false,
    });
    expect(result.readinessFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.routes)).toBe(true);
    expect(Object.isFrozen(result.routes[0])).toBe(true);
  });

  test('blocks target mismatch as evidence instead of auto-retargeting', () => {
    const accepted = handoff('projector');
    const result = evaluateHolographicReadiness({
      handoff: accepted,
      requiredCapabilities: ['depth'],
      devices: [
        { id: 'wrong-target', target: 'holo-mat', capabilities: ['depth'] },
        { id: 'projector-1', target: 'projector', capabilities: ['depth'] },
      ],
    });

    expect(result.routes).toEqual([
      expect.objectContaining({
        deviceId: 'projector-1',
        status: 'ready',
        compatible: true,
      }),
      expect.objectContaining({
        deviceId: 'wrong-target',
        status: 'blocked',
        compatible: false,
        reason: 'TARGET_MISMATCH',
        capabilityFingerprint: null,
      }),
    ]);
  });

  test('is stable across device input order', () => {
    const accepted = handoff();
    const devices = [
      { id: 'device-b', target: 'holo-mat', capabilities: ['depth'] },
      { id: 'device-a', target: 'holo-mat', capabilities: ['depth'] },
    ];
    const first = evaluateHolographicReadiness({
      handoff: accepted,
      requiredCapabilities: ['depth'],
      devices,
    });
    const second = evaluateHolographicReadiness({
      handoff: accepted,
      requiredCapabilities: ['depth'],
      devices: [...devices].reverse(),
    });

    expect(first.readinessFingerprint).toBe(second.readinessFingerprint);
    expect(first.routes).toEqual(second.routes);
  });

  test('rejects duplicate device identity', () => {
    expect(() =>
      evaluateHolographicReadiness({
        handoff: handoff(),
        devices: [
          { id: 'same', target: 'holo-mat', capabilities: [] },
          { id: ' same ', target: 'holo-mat', capabilities: [] },
        ],
      }),
    ).toThrow(/duplicate device id/);
  });

  test('rejects accessors, inherited objects, symbols, and extra authority fields', () => {
    const accepted = handoff();
    let reads = 0;
    const accessor = { id: 'device-a', target: 'holo-mat' };
    Object.defineProperty(accessor, 'capabilities', {
      enumerable: true,
      get() {
        reads += 1;
        return [];
      },
    });

    expect(() => evaluateHolographicReadiness({ handoff: accepted, devices: [accessor] })).toThrow(
      /must be enumerable data/,
    );
    expect(reads).toBe(0);

    expect(() =>
      evaluateHolographicReadiness({
        handoff: accepted,
        devices: [Object.create({ id: 'x', target: 'holo-mat', capabilities: [] })],
      }),
    ).toThrow(/must be a plain object/);

    const symbolic = { id: 'device-s', target: 'holo-mat', capabilities: [] };
    symbolic[Symbol('hidden')] = true;
    expect(() =>
      evaluateHolographicReadiness({ handoff: accepted, devices: [symbolic] }),
    ).toThrow(/symbol properties/);

    expect(() =>
      evaluateHolographicReadiness({
        handoff: accepted,
        devices: [{ id: 'device-x', target: 'holo-mat', capabilities: [], execute: true }],
      }),
    ).toThrow(/unsupported field: execute/);
  });

  test('requires at least one explicit device descriptor', () => {
    expect(() => evaluateHolographicReadiness({ handoff: handoff(), devices: [] })).toThrow(
      /at least one device descriptor/,
    );
  });
});
