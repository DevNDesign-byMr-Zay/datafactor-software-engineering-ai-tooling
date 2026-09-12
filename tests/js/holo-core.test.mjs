import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { device, negotiate, scene, transform } from '../../src/holo-core/scene.js';

describe('HoloCore scene contracts', () => {
  test('normalizes spatial transforms', () => {
    assert.deepEqual(transform({ x: 2, z: -1 }), {
      x: 2,
      y: 0,
      z: -1,
      rx: 0,
      ry: 0,
      rz: 0,
      scale: 1,
    });
  });

  test('creates a stable scene schema', () => {
    const spec = scene({
      id: 'product-demo',
      nodes: [{ id: 'hero', kind: 'model' }],
    });
    assert.equal(spec.schema, 'holo.scene.v1');
    assert.equal(spec.nodes[0].transform.scale, 1);
    assert.equal(Object.isFrozen(spec), true);
  });

  test('negotiates required device capabilities', () => {
    const spec = scene({
      id: 'demo',
      nodes: [
        {
          id: 'hero',
          data: { requires: ['depth', 'calibration'] },
        },
      ],
    });
    const target = device({
      id: 'projector-1',
      type: 'projector',
      capabilities: ['depth'],
    });
    assert.deepEqual(negotiate(spec, target), {
      compatible: false,
      missing: ['calibration'],
    });
  });
});
