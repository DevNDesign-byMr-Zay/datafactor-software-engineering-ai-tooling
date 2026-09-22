import { describe, expect, it } from '@jest/globals';

import {
  negotiateHolographicCapabilities,
  verifyHolographicCapabilityNegotiation,
} from '../../src/holographic/capability-negotiation.js';
import { planHolographicScene, TARGETS } from '../../src/holographic/scene-planner.js';
import { createValidatedHolographicSceneHandoff } from '../../src/holographic/validated-scene-handoff.js';

function buildHandoff({
  snapshotId = 'snap-capability-1',
  provenanceRef = 'prov-capability-1',
  target = 'holo-mat',
} = {}) {
  const planned = planHolographicScene({
    snapshotId,
    provenanceRef,
    intent: 'review capability support',
    target,
    objects: [{ id: 'node-1', kind: 'asset', x: 1, y: 2, z: 3 }],
  });
  return createValidatedHolographicSceneHandoff({
    envelope: planned.evidence,
    scene: planned.scene,
    snapshotId,
    sceneId: planned.scene.sceneId,
    provenanceRef,
  });
}

describe('bounded holographic capability negotiation', () => {
  it('returns immutable renderer-neutral compatibility evidence', () => {
    const handoff = buildHandoff();
    const result = negotiateHolographicCapabilities({
      handoff,
      requiredCapabilities: [' depth ', 'alpha', 'depth', ' input '],
      capabilityDescriptor: {
        target: 'holo-mat',
        capabilities: ['input', 'alpha', 'depth', 'alpha'],
      },
    });

    expect(result.compatible).toBe(true);
    expect(result.target).toBe('holo-mat');
    expect(result.sceneId).toBe(handoff.scene.sceneId);
    expect(result.sceneFingerprint).toBe(handoff.sceneFingerprint);
    expect(result.handoffFingerprint).toBe(handoff.handoffFingerprint);
    expect(result.requiredCapabilities).toEqual(['alpha', 'depth', 'input']);
    expect(result.availableCapabilities).toEqual(['alpha', 'depth', 'input']);
    expect(result.missingCapabilities).toEqual([]);
    expect(result.safety).toEqual({
      advisoryOnly: true,
      authoritative: false,
      physicalActuation: false,
    });
    expect(result.capabilityFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.requiredCapabilities)).toBe(true);
    expect(Object.isFrozen(result.availableCapabilities)).toBe(true);
  });

  it('reports deterministic missing capabilities without selecting another target', () => {
    const handoff = buildHandoff({ target: 'projector' });
    const result = negotiateHolographicCapabilities({
      handoff,
      requiredCapabilities: ['depth', 'stereo', 'alpha'],
      capabilityDescriptor: {
        target: 'projector',
        capabilities: ['alpha'],
      },
    });

    expect(result.compatible).toBe(false);
    expect(result.missingCapabilities).toEqual(['depth', 'stereo']);
    expect(result.target).toBe('projector');
  });

  it.each([...TARGETS])('keeps target vocabulary compatible for %s', (target) => {
    const handoff = buildHandoff({ target, snapshotId: `snap-${target}` });
    const result = negotiateHolographicCapabilities({
      handoff,
      requiredCapabilities: [],
      capabilityDescriptor: { target, capabilities: [] },
    });

    expect(result.compatible).toBe(true);
    expect(result.target).toBe(target);
  });

  it.each([
    [['depth', 1], 'requiredCapabilities[1]'],
    [['depth', true], 'requiredCapabilities[1]'],
    [['depth', '   '], 'requiredCapabilities[1]'],
  ])('rejects non-string or blank required capability values', (requiredCapabilities, message) => {
    const handoff = buildHandoff();
    expect(() =>
      negotiateHolographicCapabilities({
        handoff,
        requiredCapabilities,
        capabilityDescriptor: { target: 'holo-mat', capabilities: ['depth'] },
      }),
    ).toThrow(message);
  });

  it('rejects non-string available capability values instead of coercing them', () => {
    const handoff = buildHandoff();
    expect(() =>
      negotiateHolographicCapabilities({
        handoff,
        requiredCapabilities: ['depth'],
        capabilityDescriptor: { target: 'holo-mat', capabilities: ['depth', false] },
      }),
    ).toThrow('capabilityDescriptor.capabilities[1]');
  });

  it('rejects accessors without executing them', () => {
    const handoff = buildHandoff();
    let reads = 0;
    const descriptor = { target: 'holo-mat' };
    Object.defineProperty(descriptor, 'capabilities', {
      enumerable: true,
      get() {
        reads += 1;
        return ['depth'];
      },
    });

    expect(() =>
      negotiateHolographicCapabilities({
        handoff,
        requiredCapabilities: ['depth'],
        capabilityDescriptor: descriptor,
      }),
    ).toThrow(/must be enumerable data/);
    expect(reads).toBe(0);
  });

  it('rejects symbol side channels and decorated arrays', () => {
    const handoff = buildHandoff();
    const descriptor = { target: 'holo-mat', capabilities: ['depth'] };
    descriptor[Symbol('hidden')] = true;
    expect(() =>
      negotiateHolographicCapabilities({
        handoff,
        requiredCapabilities: ['depth'],
        capabilityDescriptor: descriptor,
      }),
    ).toThrow(/symbol properties/);

    const capabilities = ['depth'];
    capabilities.shadow = 'authority';
    expect(() =>
      negotiateHolographicCapabilities({
        handoff,
        requiredCapabilities: ['depth'],
        capabilityDescriptor: { target: 'holo-mat', capabilities },
      }),
    ).toThrow(/extra properties/);
  });

  it('rejects inherited or sparse requirement evidence', () => {
    const handoff = buildHandoff();
    const requirements = new Array(1);
    Object.getPrototypeOf(requirements)[0] = 'depth';
    try {
      expect(() =>
        negotiateHolographicCapabilities({
          handoff,
          requiredCapabilities: requirements,
          capabilityDescriptor: { target: 'holo-mat', capabilities: ['depth'] },
        }),
      ).toThrow(/sparse entries/);
    } finally {
      delete Object.getPrototypeOf(requirements)[0];
    }
  });

  it('rejects target substitution', () => {
    const handoff = buildHandoff({ target: 'holo-mat' });
    expect(() =>
      negotiateHolographicCapabilities({
        handoff,
        requiredCapabilities: [],
        capabilityDescriptor: { target: 'projector', capabilities: [] },
      }),
    ).toThrow(/must match the accepted handoff target/);
  });

  it('binds capability evidence to the exact handoff and rejects scene substitution', () => {
    const handoff = buildHandoff({
      snapshotId: 'snap-capability-a',
      provenanceRef: 'prov-capability-a',
    });
    const other = buildHandoff({
      snapshotId: 'snap-capability-b',
      provenanceRef: 'prov-capability-b',
    });
    const capabilityDescriptor = { target: 'holo-mat', capabilities: ['depth'] };
    const result = negotiateHolographicCapabilities({
      handoff,
      requiredCapabilities: ['depth'],
      capabilityDescriptor,
    });

    expect(
      verifyHolographicCapabilityNegotiation(result, {
        handoff,
        requiredCapabilities: ['depth'],
        capabilityDescriptor,
      }),
    ).toBe(true);
    expect(
      verifyHolographicCapabilityNegotiation(result, {
        handoff: other,
        requiredCapabilities: ['depth'],
        capabilityDescriptor,
      }),
    ).toBe(false);
  });

  it('rejects stale capability evidence after available capabilities change', () => {
    const handoff = buildHandoff();
    const result = negotiateHolographicCapabilities({
      handoff,
      requiredCapabilities: ['depth'],
      capabilityDescriptor: { target: 'holo-mat', capabilities: ['depth'] },
    });

    expect(
      verifyHolographicCapabilityNegotiation(result, {
        handoff,
        requiredCapabilities: ['depth'],
        capabilityDescriptor: { target: 'holo-mat', capabilities: [] },
      }),
    ).toBe(false);
  });

  it('rejects tampered result fields even when the attacker keeps the old fingerprint', () => {
    const handoff = buildHandoff();
    const options = {
      handoff,
      requiredCapabilities: ['depth'],
      capabilityDescriptor: { target: 'holo-mat', capabilities: ['depth'] },
    };
    const result = negotiateHolographicCapabilities(options);

    expect(
      verifyHolographicCapabilityNegotiation(
        { ...result, compatible: false, missingCapabilities: ['depth'] },
        options,
      ),
    ).toBe(false);
  });
});
