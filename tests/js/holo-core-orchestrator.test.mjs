import { describe, expect, test } from '@jest/globals';

import { orchestrateSpatialScene, scene } from '../../src/index.js';

describe('HoloCore multi-device orchestration', () => {
  test('routes one scene across compatible and blocked targets', () => {
    const result = orchestrateSpatialScene({
      sceneSpec: scene({
        id: 'showcase',
        nodes: [{ id: 'hero', data: { requires: ['depth'] } }],
      }),
      devices: [
        { id: 'projector-1', type: 'projector', capabilities: ['depth'] },
        { id: 'mat-1', type: 'holomat', capabilities: [] },
      ],
    });

    expect(result.sceneId).toBe('showcase');
    expect(result.ready).toBe(true);
    expect(result.routes).toEqual([
      {
        deviceId: 'projector-1',
        deviceType: 'projector',
        compatible: true,
        missing: [],
        status: 'ready',
      },
      {
        deviceId: 'mat-1',
        deviceType: 'holomat',
        compatible: false,
        missing: ['depth'],
        status: 'blocked',
      },
    ]);
  });

  test('requires a valid scene and at least one device', () => {
    expect(() => orchestrateSpatialScene({ sceneSpec: {}, devices: [] })).toThrow(/HoloCore scene/);
    expect(() => orchestrateSpatialScene({ sceneSpec: scene({ id: 'x' }), devices: [] })).toThrow(
      /device/,
    );
  });
});
