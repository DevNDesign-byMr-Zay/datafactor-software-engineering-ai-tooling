import { describe, expect, it } from '@jest/globals';
import { planHolographicScene } from '../../src/holographic/scene-planner.js';
import { validateHolographicProvenanceBinding } from '../../src/holographic/provenance-chain.js';
import { fingerprintHolographicScene } from '../../src/holographic/scene-fingerprint.js';
import {
  createValidatedHolographicSceneHandoff,
  verifyValidatedHolographicSceneHandoff,
} from '../../src/holographic/validated-scene-handoff.js';

describe('validated holographic scene handoff', () => {
  function plannedFixture({
    snapshotId = 'snap-handoff-1',
    provenanceRef = 'prov-handoff-1',
    nodeId = 'node-1',
  } = {}) {
    return planHolographicScene({
      snapshotId,
      provenanceRef,
      intent: 'inspect',
      target: 'holo-mat',
      objects: [{ id: nodeId, kind: 'load', x: 1, y: 2, z: 3 }],
    });
  }

  function build() {
    const planned = plannedFixture();
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
    const planned = plannedFixture({
      snapshotId: 'snap-handoff-2',
      provenanceRef: 'prov-handoff-2',
      nodeId: 'node-2',
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
    const planned = plannedFixture({
      snapshotId: 'snap-handoff-3',
      provenanceRef: 'prov-handoff-3',
      nodeId: 'node-3',
    });
    const handoff = createValidatedHolographicSceneHandoff({
      envelope: planned.evidence,
      scene: planned.scene,
      snapshotId: 'snap-handoff-3',
      sceneId: planned.scene.sceneId,
      provenanceRef: 'prov-handoff-3',
    });
    const other = plannedFixture({
      snapshotId: 'snap-other',
      provenanceRef: 'prov-other',
      nodeId: 'other',
    });

    expect(verifyValidatedHolographicSceneHandoff(handoff, { envelope: other.evidence })).toBe(
      false,
    );
  });

  it('does not execute accessors while capturing a scene or source envelope', () => {
    const planned = plannedFixture({
      snapshotId: 'snap-handoff-accessor',
      provenanceRef: 'prov-handoff-accessor',
      nodeId: 'node-accessor',
    });
    let sceneGetterReads = 0;
    const deceptiveScene = { ...planned.scene };
    Object.defineProperty(deceptiveScene, 'nodes', {
      enumerable: true,
      get() {
        sceneGetterReads += 1;
        return planned.scene.nodes;
      },
    });

    expect(() =>
      createValidatedHolographicSceneHandoff({
        envelope: planned.evidence,
        scene: deceptiveScene,
        snapshotId: 'snap-handoff-accessor',
        sceneId: planned.scene.sceneId,
        provenanceRef: 'prov-handoff-accessor',
      }),
    ).toThrow(/must not use accessors/);
    expect(sceneGetterReads).toBe(0);

    const handoff = createValidatedHolographicSceneHandoff({
      envelope: planned.evidence,
      scene: planned.scene,
      snapshotId: 'snap-handoff-accessor',
      sceneId: planned.scene.sceneId,
      provenanceRef: 'prov-handoff-accessor',
    });
    let envelopeGetterReads = 0;
    const deceptiveEnvelope = { ...planned.evidence };
    Object.defineProperty(deceptiveEnvelope, 'fingerprint', {
      enumerable: true,
      get() {
        envelopeGetterReads += 1;
        return planned.evidence.fingerprint;
      },
    });

    expect(verifyValidatedHolographicSceneHandoff(handoff, { envelope: deceptiveEnvelope })).toBe(
      false,
    );
    expect(envelopeGetterReads).toBe(0);
  });

  it('rejects deceptive handoff descriptors without executing getters', () => {
    const handoff = build();
    let getterReads = 0;
    const deceptive = { ...handoff };
    Object.defineProperty(deceptive, 'handoffFingerprint', {
      enumerable: true,
      get() {
        getterReads += 1;
        return handoff.handoffFingerprint;
      },
    });

    expect(verifyValidatedHolographicSceneHandoff(deceptive)).toBe(false);
    expect(getterReads).toBe(0);
  });

  it('rejects side-channel fields, symbols, and decorated scene arrays', () => {
    const handoff = build();
    expect(verifyValidatedHolographicSceneHandoff({ ...handoff, hiddenAuthority: true })).toBe(
      false,
    );

    const symbolic = { ...handoff };
    symbolic[Symbol('authority')] = true;
    expect(verifyValidatedHolographicSceneHandoff(symbolic)).toBe(false);

    const nodes = handoff.scene.nodes.map((node) => ({ ...node }));
    nodes.shadowAuthority = true;
    expect(
      verifyValidatedHolographicSceneHandoff({
        ...handoff,
        scene: { ...handoff.scene, nodes },
      }),
    ).toBe(false);
  });

  it('rejects provenance scenes whose identity is inherited instead of owned', () => {
    const planned = plannedFixture({
      snapshotId: 'snap-prototype-scene',
      provenanceRef: 'prov-prototype-scene',
      nodeId: 'node-prototype-scene',
    });
    const prototype = { ...planned.scene };
    delete prototype.sceneId;
    delete prototype.snapshotId;
    const forgedScene = Object.create(prototype);
    Object.assign(forgedScene, { nodes: planned.scene.nodes });
    const fingerprint = fingerprintHolographicScene(forgedScene);

    expect(
      validateHolographicProvenanceBinding({
        envelope: planned.evidence,
        snapshotId: 'snap-prototype-scene',
        sceneId: planned.scene.sceneId,
        provenanceRef: 'prov-prototype-scene',
        scene: forgedScene,
        sceneFingerprint: fingerprint,
      }),
    ).toBe(false);
  });
});
