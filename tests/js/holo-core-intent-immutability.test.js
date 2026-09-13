import {
  interpretHolographicIntent,
  planSpatialScene,
  validateHolographicEvidenceEnvelope,
} from '../../src/index.js';

describe('HoloCore intent immutability', () => {
  test('copies and deeply freezes nested constraints and animation', () => {
    const constraints = {
      layout: { maxNodes: 4 },
      preferredCapabilities: ['depth'],
    };
    const animation = {
      timeline: { loop: true },
      cues: [{ name: 'intro', durationMs: 300 }],
    };

    const intent = interpretHolographicIntent({
      prompt: 'Show immutable intent',
      constraints,
      animation,
    });

    constraints.layout.maxNodes = 99;
    constraints.preferredCapabilities.push('selection');
    animation.timeline.loop = false;
    animation.cues[0].durationMs = 900;

    expect(intent.constraints).toEqual({
      layout: { maxNodes: 4 },
      preferredCapabilities: ['depth'],
    });
    expect(intent.animation.timeline.loop).toBe(true);
    expect(intent.animation.cues[0].durationMs).toBe(300);
    expect(Object.isFrozen(intent.constraints.layout)).toBe(true);
    expect(Object.isFrozen(intent.constraints.preferredCapabilities)).toBe(true);
    expect(Object.isFrozen(intent.animation.cues[0])).toBe(true);
  });

  test('later caller mutation cannot invalidate already-planned evidence', () => {
    const constraints = { layout: { maxNodes: 2 } };
    const planned = planSpatialScene({
      intent: {
        prompt: 'Preserve evidence payload',
        target: 'web-dashboard',
        constraints,
      },
      assets: [{ id: 'asset-1' }],
      device: {
        id: 'browser-preview',
        target: 'web-dashboard',
        capabilities: [],
        simulated: true,
      },
      snapshotId: 'snapshot-immutability-001',
      provenanceRef: 'receipt-immutability-001',
    });

    const fingerprint = planned.evidence.fingerprint;
    constraints.layout.maxNodes = 500;

    expect(planned.scene.metadata.constraints.layout.maxNodes).toBe(2);
    expect(planned.evidence.fingerprint).toBe(fingerprint);
    expect(validateHolographicEvidenceEnvelope(planned.evidence)).toBe(true);
  });
});
