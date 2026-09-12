import { describe, expect, test } from '@jest/globals';

import { device, negotiate, scene } from '../../src/holo-core/scene.js';
import { planSpatialScene } from '../../src/holo-core/planner.js';

describe('HoloCore capability determinism', () => {
  test('copies and freezes scene capability requirements', () => {
    const requires = ['depth'];
    const spec = scene({ id: 'demo', nodes: [{ id: 'hero', data: { requires } }] });

    requires.push('calibration');

    expect(spec.nodes[0].data.requires).toEqual(['depth']);
    expect(Object.isFrozen(spec.nodes[0].data.requires)).toBe(true);
    expect(
      negotiate(
        spec,
        device({ id: 'projector-1', type: 'projector', capabilities: ['depth'] }),
      ),
    ).toEqual({ compatible: true, missing: [] });
  });

  test('rejects malformed capability requirements locally', () => {
    expect(() =>
      scene({ id: 'bad', nodes: [{ id: 'hero', data: { requires: 'depth' } }] }),
    ).toThrow(/requires must be an array/);
  });

  test('returns a normalized device from planning', () => {
    const result = planSpatialScene({
      intent: 'Depth demo',
      assets: [{ id: 'hero', requires: ['depth'] }],
      device: { id: '  projector-1  ', type: 'projector', capabilities: ['depth', 'depth'] },
    });

    expect(result.device.id).toBe('projector-1');
    expect(result.device.capabilities).toEqual(['depth']);
    expect(Object.isFrozen(result.device)).toBe(true);
  });
});
