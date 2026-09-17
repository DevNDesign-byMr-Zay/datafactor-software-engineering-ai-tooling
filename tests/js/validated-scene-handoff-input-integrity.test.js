import { describe, expect, it } from '@jest/globals';
import { planHolographicScene } from '../../src/holographic/scene-planner.js';
import {
  createValidatedHolographicSceneHandoff,
  verifyValidatedHolographicSceneHandoff,
} from '../../src/holographic/validated-scene-handoff.js';

function plannedFixture() {
  return planHolographicScene({
    snapshotId: 'snap-input-integrity',
    provenanceRef: 'prov-input-integrity',
    intent: 'inspect',
    target: 'holo-mat',
    objects: [{ id: 'node-1', kind: 'load', x: 1, y: 2, z: 3 }],
  });
}

function validInput() {
  const planned = plannedFixture();
  return {
    envelope: planned.evidence,
    scene: planned.scene,
    snapshotId: 'snap-input-integrity',
    sceneId: planned.scene.sceneId,
    provenanceRef: 'prov-input-integrity',
  };
}

function build() {
  return createValidatedHolographicSceneHandoff(validInput());
}

describe('validated scene handoff input integrity', () => {
  it('rejects top-level creation accessors without evaluating them', () => {
    const input = validInput();
    let getterReads = 0;
    Object.defineProperty(input, 'scene', {
      enumerable: true,
      configurable: true,
      get() {
        getterReads += 1;
        return plannedFixture().scene;
      },
    });

    expect(() => createValidatedHolographicSceneHandoff(input)).toThrow(
      /handoff input.scene must not use accessors/,
    );
    expect(getterReads).toBe(0);
  });

  it('rejects verification-option accessors without evaluating them', () => {
    const handoff = build();
    let getterReads = 0;
    const options = {};
    Object.defineProperty(options, 'envelope', {
      enumerable: true,
      get() {
        getterReads += 1;
        return plannedFixture().evidence;
      },
    });

    expect(verifyValidatedHolographicSceneHandoff(handoff, options)).toBe(false);
    expect(getterReads).toBe(0);
  });

  it('keeps prototype-named nested evidence visible to fingerprint verification', () => {
    const handoff = build();
    const prototypeNamed = JSON.parse('{"__proto__":{"hiddenAuthority":true}}');
    const forgedScene = { ...handoff.scene, ...prototypeNamed };
    const forgedHandoff = { ...handoff, scene: forgedScene };

    expect(Object.hasOwn(forgedScene, '__proto__')).toBe(true);
    expect(verifyValidatedHolographicSceneHandoff(forgedHandoff)).toBe(false);
  });

  it('does not drop prototype-named fields from the source envelope during creation', () => {
    const input = validInput();
    const prototypeNamed = JSON.parse('{"__proto__":{"hiddenAuthority":true}}');
    input.envelope = { ...input.envelope, ...prototypeNamed };

    expect(Object.hasOwn(input.envelope, '__proto__')).toBe(true);
    expect(() => createValidatedHolographicSceneHandoff(input)).toThrow(
      /failed acceptance gate|unsupported field/,
    );
  });

  it('rejects non-string identity objects without coercing them', () => {
    const input = validInput();
    let coercionReads = 0;
    input.snapshotId = {
      toString() {
        coercionReads += 1;
        return 'snap-input-integrity';
      },
    };

    expect(() => createValidatedHolographicSceneHandoff(input)).toThrow(
      /snapshotId must be a non-empty string/,
    );
    expect(coercionReads).toBe(0);
  });

  it('rejects unsupported and symbol-bearing top-level creation fields', () => {
    const unsupported = { ...validInput(), executeNow: true };
    expect(() => createValidatedHolographicSceneHandoff(unsupported)).toThrow(
      /unsupported field: executeNow/,
    );

    const symbolic = validInput();
    symbolic[Symbol('authority')] = true;
    expect(() => createValidatedHolographicSceneHandoff(symbolic)).toThrow(/symbol properties/);
  });
});
