import { describe, expect, it } from '@jest/globals';
import { planHolographicScene } from '../../src/holographic/scene-planner.js';
import {
  createValidatedHolographicSceneHandoff,
  verifyValidatedHolographicSceneHandoff,
} from '../../src/holographic/validated-scene-handoff.js';

describe('validated holographic scene handoff', () => {
  function build() {
    const planned = planHolographicScene({
      snapshotId: 'snap-handoff-1',
      provenanceRef: 'prov-handoff-1',
      intent: 'inspect',
      target: 'holo-mat',
      objects: [{ id: 'node-1', kind: 'load', x: 1, y: 2, z: 3 }],
    });
    return createValidatedHolographicSceneHandoff({
      envelope: planned.evidence,
      scene: planned.scene,
      snapshotId: 'snap-handoff-1',
      sceneId: planned.scene.sceneId,
      provenanceRef: 'prov-handoff-1',
    });
  }

  it('emits a verifiable immutable advisory handoff', () => {
    const handoff = build();
    expect(verifyValidatedHolographicSceneHandoff(handoff)).toBe(true);
    expect(handoff.safety).toEqual({
      authoritative: false,
      physicalActuation: false,
      advisoryOnly: true,
    });
    expect(handoff.handoffFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects scene mutation after handoff construction', () => {
    const handoff = build();
    const tampered = {
      ...handoff,
      scene: {
        ...handoff.scene,
        nodes: [{ ...handoff.scene.nodes[0], position: { x: 99, y: 2, z: 3 } }],
      },
    };
    expect(verifyValidatedHolographicSceneHandoff(tampered)).toBe(false);
  });

  it('rejects forged fingerprints and unsafe authority flags', () => {
    const handoff = build();
    expect(
      verifyValidatedHolographicSceneHandoff({
        ...handoff,
        handoffFingerprint: '0'.repeat(64),
      }),
    ).toBe(false);
    expect(
      verifyValidatedHolographicSceneHandoff({
        ...handoff,
        safety: { authoritative: true, physicalActuation: false, advisoryOnly: true },
      }),
    ).toBe(false);
  });
});
