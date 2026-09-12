import { describe, expect, test } from '@jest/globals';

import { device } from '../../src/holo-core/scene.js';
import { planSpatialScene } from '../../src/holo-core/planner.js';

describe('HoloCore spatial planner', () => {
  test('maps intent and assets into a stable scene plan', () => {
    const target = device({ id: 'holomat-01', type: 'holomat', capabilities: ['depth'] });
    const result = planSpatialScene({
      intent: 'Floating product display',
      assets: [{ id: 'product', requires: ['depth'] }],
      device: target,
    });

    expect(result.scene.schema).toBe('holo.scene.v1');
    expect(result.scene.metadata.intent).toBe('Floating product display');
    expect(result.compatibility).toEqual({ compatible: true, missing: [] });
  });

  test('reports missing capabilities without changing the scene contract', () => {
    const target = device({ id: 'projector-01', type: 'projector', capabilities: [] });
    const result = planSpatialScene({
      intent: 'Depth presentation',
      assets: [{ id: 'hero', requires: ['depth'] }],
      device: target,
    });

    expect(result.compatibility).toEqual({ compatible: false, missing: ['depth'] });
    expect(result.scene.nodes).toHaveLength(1);
  });
});
