import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

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

    assert.equal(result.scene.schema, 'holo.scene.v1');
    assert.equal(result.scene.metadata.intent, 'Floating product display');
    assert.deepEqual(result.compatibility, { compatible: true, missing: [] });
  });

  test('reports missing capabilities without changing the scene contract', () => {
    const target = device({ id: 'projector-01', type: 'projector', capabilities: [] });
    const result = planSpatialScene({
      intent: 'Depth presentation',
      assets: [{ id: 'hero', requires: ['depth'] }],
      device: target,
    });

    assert.deepEqual(result.compatibility, { compatible: false, missing: ['depth'] });
    assert.equal(result.scene.nodes.length, 1);
  });
});
