import { describe, expect, test } from '@jest/globals';
import { planHolographicScene } from '../../src/holographic/scene-planner.js';
import {
  createValidatedHolographicSceneHandoff,
  verifyValidatedHolographicSceneHandoff,
} from '../../src/holographic/validated-scene-handoff.js';

function validInput() {
  const planned = planHolographicScene({
    snapshotId: 'snap-edge-handoff',
    provenanceRef: 'prov-edge-handoff',
    intent: 'inspect',
    target: 'holo-mat',
    objects: [{ id: 'node-edge', kind: 'load', x: 1, y: 2, z: 3 }],
  });
  return {
    envelope: planned.evidence,
    scene: planned.scene,
    snapshotId: 'snap-edge-handoff',
    sceneId: planned.scene.sceneId,
    provenanceRef: 'prov-edge-handoff',
  };
}

describe('holographic validated scene handoff evidence capture edges', () => {
  test('rejects sparse scene arrays before acceptance evaluation', () => {
    const input = validInput();
    const sparseNodes = [];
    sparseNodes[1] = input.scene.nodes[0];
    input.scene = { ...input.scene, nodes: sparseNodes };
    expect(() => createValidatedHolographicSceneHandoff(input)).toThrow(/sparse arrays/);
  });

  test('rejects non-finite numeric evidence', () => {
    const input = validInput();
    input.scene = {
      ...input.scene,
      nodes: input.scene.nodes.map((node) => ({
        ...node,
        position: { ...node.position, x: Number.POSITIVE_INFINITY },
      })),
    };
    expect(() => createValidatedHolographicSceneHandoff(input)).toThrow(/numbers must be finite/);
  });

  test('rejects circular scene evidence', () => {
    const input = validInput();
    const scene = { ...input.scene };
    scene.self = scene;
    input.scene = scene;
    expect(() => createValidatedHolographicSceneHandoff(input)).toThrow(/circular references/);
  });

  test('rejects hidden nested evidence and non-plain verification options', () => {
    const input = validInput();
    const node = { ...input.scene.nodes[0] };
    Object.defineProperty(node, 'hiddenAuthority', { enumerable: false, value: true });
    input.scene = { ...input.scene, nodes: [node] };
    expect(() => createValidatedHolographicSceneHandoff(input)).toThrow(
      /must be enumerable evidence/,
    );

    const handoff = createValidatedHolographicSceneHandoff(validInput());
    expect(verifyValidatedHolographicSceneHandoff(handoff, new Date())).toBe(false);
  });
});
