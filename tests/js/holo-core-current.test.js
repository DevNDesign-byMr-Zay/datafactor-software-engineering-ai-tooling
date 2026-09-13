import {
  handoffSpatialInteraction,
  interpretHolographicIntent,
  normalizeSpatialInteractionIntent,
  orchestrateSpatialScene,
  planSpatialScene,
  validateHolographicEvidenceEnvelope,
} from '../../src/index.js';

describe('current HoloCore spatial contract', () => {
  const device = {
    id: 'display-1',
    target: 'holo-mat',
    capabilities: ['depth', 'selection'],
    simulated: true,
  };

  const planInput = {
    intent: {
      prompt: 'Show the audited system state',
      target: 'holo-mat',
      interaction: { type: 'focus', nodeId: 'asset-1' },
    },
    assets: [{ id: 'asset-1', requires: ['depth'] }],
    device,
    snapshotId: 'snapshot-001',
    provenanceRef: 'receipt-001',
  };

  test('plans deterministic provenance-bound spatial evidence', () => {
    const first = planSpatialScene(planInput);
    const second = planSpatialScene({ ...planInput });

    expect(first.scene.schema).toBe('holo.scene.v2');
    expect(first.scene.snapshotId).toBe('snapshot-001');
    expect(first.scene.provenanceRef).toBe('receipt-001');
    expect(first.compatibility.compatible).toBe(true);
    expect(validateHolographicEvidenceEnvelope(first.evidence)).toBe(true);
    expect(first.evidence.fingerprint).toBe(second.evidence.fingerprint);
  });

  test('uses the evidence-envelope target vocabulary', () => {
    expect(
      interpretHolographicIntent({
        prompt: 'Render a browser fallback',
        target: 'web-dashboard',
      }).target,
    ).toBe('web-dashboard');

    expect(() =>
      interpretHolographicIntent({
        prompt: 'Use a legacy target name',
        target: 'holomat',
      }),
    ).toThrow(/Unsupported holographic target/);
  });

  test('fails closed when intent and device targets disagree', () => {
    expect(() =>
      planSpatialScene({
        ...planInput,
        device: { ...device, target: 'projector' },
      }),
    ).toThrow(/does not match device target/);
  });

  test('blocks devices that lack required scene capabilities', () => {
    const planned = planSpatialScene(planInput);
    const result = orchestrateSpatialScene({
      sceneSpec: planned.scene,
      devices: [{ ...device, capabilities: [] }],
    });

    expect(result.ready).toBe(false);
    expect(result.routes[0].status).toBe('blocked');
    expect(result.routes[0].missing).toEqual(['depth']);
    expect(result.provenanceRef).toBe('receipt-001');
  });

  test('rejects malformed capability names instead of string-coercing them', () => {
    expect(() =>
      planSpatialScene({
        ...planInput,
        assets: [{ id: 'asset-1', requires: [42] }],
      }),
    ).toThrow(/non-empty string/);

    expect(() =>
      planSpatialScene({
        ...planInput,
        device: { ...device, capabilities: ['depth', false] },
      }),
    ).toThrow(/non-empty string/);
  });

  test('canonicalizes capability whitespace before compatibility checks', () => {
    const planned = planSpatialScene({
      ...planInput,
      assets: [{ id: 'asset-1', requires: [' depth ', 'depth'] }],
      device: { ...device, capabilities: [' depth ', 'selection'] },
    });

    expect(planned.scene.nodes[0].data.requires).toEqual(['depth']);
    expect(planned.device.capabilities).toEqual(['depth', 'selection']);
    expect(planned.compatibility).toEqual({ compatible: true, missing: [] });
  });

  test('normalizes interaction before downstream handoff', () => {
    const normalized = normalizeSpatialInteractionIntent({
      type: 'orbit',
      deltaYaw: 4,
      deltaPitch: -2,
    });
    expect(normalized).toEqual({ type: 'orbit', deltaYaw: 4, deltaPitch: -2 });

    const handled = handoffSpatialInteraction({
      interaction: { type: 'select', nodeId: ' asset-1 ' },
      handler: (interaction) => interaction,
    });
    expect(handled).toEqual({ type: 'select', nodeId: 'asset-1' });
  });
});
