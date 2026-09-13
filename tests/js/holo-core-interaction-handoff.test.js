import { describe, expect, jest, test } from '@jest/globals';

import { handoffSpatialInteraction } from '../../src/holo-core/orchestrator.js';

describe('HoloCore interaction orchestration handoff', () => {
  test('passes one normalized interaction through to the downstream handler unchanged', () => {
    const handler = jest.fn((action) => action);

    const result = handoffSpatialInteraction({
      interaction: { type: 'orbit', deltaYaw: 14, deltaPitch: -3 },
      handler,
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ type: 'orbit', deltaYaw: 14, deltaPitch: -3 });
    expect(result).toBe(handler.mock.calls[0][0]);
    expect(Object.isFrozen(result)).toBe(true);
  });

  test('rejects malformed interactions before any downstream handler runs', () => {
    const handler = jest.fn();

    expect(() =>
      handoffSpatialInteraction({
        interaction: { type: 'focus', nodeId: '' },
        handler,
      }),
    ).toThrow(/nodeId/);

    expect(handler).not.toHaveBeenCalled();
  });
});
