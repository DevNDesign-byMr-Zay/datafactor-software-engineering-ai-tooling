import { device, negotiate, scene, transform } from '../../src/holo-core/scene.js';

describe('HoloCore scene contracts', () => {
  test('normalizes spatial transforms', () => {
    expect(transform({ x: 2, z: -1 })).toEqual({ x: 2, y: 0, z: -1, rx: 0, ry: 0, rz: 0, scale: 1 });
  });

  test('creates a stable scene schema', () => {
    const spec = scene({ id: 'product-demo', nodes: [{ id: 'hero', kind: 'model' }] });
    expect(spec.schema).toBe('holo.scene.v1');
    expect(spec.nodes[0].transform.scale).toBe(1);
    expect(Object.isFrozen(spec)).toBe(true);
  });

  test('negotiates required device capabilities', () => {
    const spec = scene({ id: 'demo', nodes: [{ id: 'hero', data: { requires: ['depth', 'calibration'] } }] });
    const target = device({ id: 'projector-1', type: 'projector', capabilities: ['depth'] });
    expect(negotiate(spec, target)).toEqual({ compatible: false, missing: ['calibration'] });
  });
});
