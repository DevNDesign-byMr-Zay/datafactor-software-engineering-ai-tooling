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
    expect(handoff.provenanceCommitment).toMatch(/^[a-f0-9]{64}$/);
    expect(handoff.acceptance).toMatchObject({
      accepted: true,
      provenanceValid: true,
      fingerprintValid: true,
      safetyValid: true,
      authoritative: false,
      physicalActuation: false,
      advisoryOnly: true,
    });
    expect(handoff.provenanceBinding).toMatchObject({
      snapshotId: 'snap-handoff-1',
      sceneId: handoff.scene.sceneId,
      provenanceRef: 'prov-handoff-1',
    });
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
      verifyValidatedHolographicSceneHandoff({ ...handoff, handoffFingerprint: '0'.repeat(64) }),
    ).toBe(false);
    expect(
      verifyValidatedHolographicSceneHandoff({
        ...handoff,
        safety: { authoritative: true, physicalActuation: false, advisoryOnly: true },
      }),
    ).toBe(false);
    expect(
      verifyValidatedHolographicSceneHandoff({
        ...handoff,
        acceptance: { ...handoff.acceptance, accepted: false },
      }),
    ).toBe(false);
  });

  it('rejects a recomputed handoff fingerprint when acceptance booleans contradict', () => {
    const handoff = build();
    const forgedAcceptance = {
      ...handoff.acceptance,
      provenanceValid: false,
      fingerprintValid: true,
      safetyValid: true,
      accepted: true,
    };
    const withoutFingerprint = { ...handoff, acceptance: forgedAcceptance };
    delete withoutFingerprint.handoffFingerprint;
    expect(verifyValidatedHolographicSceneHandoff(withoutFingerprint)).toBe(false);
  });

  it('rejects acceptance objects with non-boolean integrity fields', () => {
    const handoff = build();
    const withoutFingerprint = {
      ...handoff,
      acceptance: { ...handoff.acceptance, safetyValid: 'true' },
    };
    delete withoutFingerprint.handoffFingerprint;
    expect(verifyValidatedHolographicSceneHandoff(withoutFingerprint)).toBe(false);
  });

  it('rejects provenance binding drift even when the outer fingerprint is recomputed', () => {
    const handoff = build();
    const forged = {
      ...handoff,
      provenanceBinding: {
        ...handoff.provenanceBinding,
        provenanceRef: 'prov-handoff-attacker',
      },
    };
    delete forged.handoffFingerprint;
    expect(verifyValidatedHolographicSceneHandoff(forged)).toBe(false);
  });

  it('rejects provenance commitment substitution even when the binding is unchanged', () => {
    const handoff = build();
    const forged = { ...handoff, provenanceCommitment: '0'.repeat(64) };
    delete forged.handoffFingerprint;
    expect(verifyValidatedHolographicSceneHandoff(forged)).toBe(false);
  });

  it('rejects binding metadata that is not structurally complete', () => {
    const handoff = build();
    const forged = {
      ...handoff,
      provenanceBinding: { ...handoff.provenanceBinding, sceneId: 42 },
    };
    delete forged.handoffFingerprint;
    expect(verifyValidatedHolographicSceneHandoff(forged)).toBe(false);
  });

  it('re-validates the source envelope instead of trusting only the embedded fingerprint', () => {
    const planned = planHolographicScene({
      snapshotId: 'snap-handoff-2',
      provenanceRef: 'prov-handoff-2',
      intent: 'inspect',
      target: 'holo-mat',
      objects: [{ id: 'node-2', kind: 'load', x: 4, y: 5, z: 6 }],
    });
    const handoff = createValidatedHolographicSceneHandoff({
      envelope: planned.evidence,
      scene: planned.scene,
      snapshotId: 'snap-handoff-2',
      sceneId: planned.scene.sceneId,
      provenanceRef: 'prov-handoff-2',
    });

    expect(verifyValidatedHolographicSceneHandoff(handoff, { envelope: planned.evidence })).toBe(
      true,
    );
    const forgedEnvelope = { ...planned.evidence, provenanceRef: 'prov-attacker' };
    expect(verifyValidatedHolographicSceneHandoff(handoff, { envelope: forgedEnvelope })).toBe(
      false,
    );
  });

  it('rejects an envelope swap even when the attacker keeps the handoff binding unchanged', () => {
    const planned = planHolographicScene({
      snapshotId: 'snap-handoff-3',
      provenanceRef: 'prov-handoff-3',
      intent: 'inspect',
      target: 'holo-mat',
      objects: [{ id: 'node-3', kind: 'load', x: 7, y: 8, z: 9 }],
    });
    const handoff = createValidatedHolographicSceneHandoff({
      envelope: planned.evidence,
      scene: planned.scene,
      snapshotId: 'snap-handoff-3',
      sceneId: planned.scene.sceneId,
      provenanceRef: 'prov-handoff-3',
    });
    const other = planHolographicScene({
      snapshotId: 'snap-other',
      provenanceRef: 'prov-other',
      intent: 'inspect',
      target: 'holo-mat',
      objects: [{ id: 'other', kind: 'load', x: 0, y: 0, z: 0 }],
    });

    expect(verifyValidatedHolographicSceneHandoff(handoff, { envelope: other.evidence })).toBe(
      false,
    );
  });
});
