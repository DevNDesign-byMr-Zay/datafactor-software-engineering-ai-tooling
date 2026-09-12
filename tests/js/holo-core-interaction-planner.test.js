import { describe, expect, test } from '@jest/globals';

import { device } from '../../src/holo-core/scene.js';
import { planSpatialScene } from '../../src/holo-core/planner.js';

describe('HoloCore interaction planning', () => {
  test('preserves normalized interaction intent for downstream adapters', () => {
    const target = device({ id: 'projector-01', type: 'projector' });
    const result = planSpatialScene({
      intent: {
        prompt: 'Move around the feature callout.',
        displayType: 'projector',
        interaction: { type: 'orbit', deltaYaw: 12, deltaPitch: 3 },
      },
      device: target,
    });

    expect(result.intent.interaction).toEqual({ type: 'orbit', deltaYaw: 12, deltaPitch: 3 });
    expect(result.scene.metadata.interaction).toEqual({
      type: 'orbit',
      deltaYaw: 12,
      deltaPitch: 3,
    });
    expect(Object.isFrozen(result.scene.metadata.interaction)).toBe(true);
  });
});
