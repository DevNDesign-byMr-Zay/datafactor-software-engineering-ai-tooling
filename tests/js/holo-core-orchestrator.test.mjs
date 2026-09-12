import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

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

    assert.equal(result.sceneId, 'showcase');
    assert.equal(result.ready, true);
    assert.deepEqual(result.routes, [
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
    assert.throws(() => orchestrateSpatialScene({ sceneSpec: {}, devices: [] }), /HoloCore scene/);
    assert.throws(
      () => orchestrateSpatialScene({ sceneSpec: scene({ id: 'x' }), devices: [] }),
      /device/,
    );
  });
});
