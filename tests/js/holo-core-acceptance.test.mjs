import { createSpatialAcceptanceReceipt } from '../../src/holo-core/acceptance.js';
import { interpretHolographicIntent } from '../../src/holo-core/intent.js';
import { planSpatialScene } from '../../src/holo-core/planner.js';
import { device } from '../../src/holo-core/scene.js';

describe('holo-core spatial acceptance', () => {
  test('links normalized intent, scene, device and capability negotiation', () => {
    const intent = interpretHolographicIntent({
      prompt: 'Show the product in depth',
      sceneType: 'product',
      displayType: 'projector',
    });
    const target = device({ id: 'projector-1', type: 'projector', capabilities: ['depth'] });
    const plan = planSpatialScene({
      intent,
      assets: [{ id: 'product', requires: ['depth'] }],
      device: target,
    });
    const receipt = createSpatialAcceptanceReceipt({
      intent: plan.intent,
      sceneSpec: plan.scene,
      device: target,
    });
    expect(receipt.accepted).toBe(true);
    expect(receipt.compatibility).toEqual({ compatible: true, missing: [] });
    expect(receipt.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  test('produces stable fingerprints for identical acceptance inputs', () => {
    const intent = interpretHolographicIntent({
      prompt: 'diagram',
      sceneType: 'diagram',
      displayType: 'holomat',
    });
    const target = device({ id: 'mat-1', type: 'holomat', capabilities: [] });
    const plan = planSpatialScene({ intent, assets: [{ id: 'diagram' }], device: target });
    const a = createSpatialAcceptanceReceipt({
      intent: plan.intent,
      sceneSpec: plan.scene,
      device: target,
    });
    const b = createSpatialAcceptanceReceipt({
      intent: plan.intent,
      sceneSpec: plan.scene,
      device: target,
    });
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  test('covers projector, HoloMat and 3D-platform acceptance independently', () => {
    const matrix = [
      ['projector', ['depth'], 'projector-1'],
      ['holomat', ['surface-mapping'], 'mat-1'],
      ['three-d-platform', ['platform-staging'], 'platform-1'],
    ];
    for (const [displayType, capabilities, id] of matrix) {
      const intent = interpretHolographicIntent({
        prompt: `${displayType} demo`,
        sceneType: 'presentation',
        displayType,
      });
      const target = device({ id, type: displayType, capabilities });
      const plan = planSpatialScene({
        intent,
        assets: [{ id: 'hero', requires: capabilities }],
        device: target,
      });
      const receipt = createSpatialAcceptanceReceipt({
        intent: plan.intent,
        sceneSpec: plan.scene,
        device: target,
      });
      expect(receipt.accepted).toBe(true);
      expect(receipt.deviceType).toBe(displayType);
    }
  });

  test('rejects capability gaps without pretending the hardware is executable', () => {
    const intent = interpretHolographicIntent({
      prompt: 'surface map',
      sceneType: 'diagram',
      displayType: 'holomat',
    });
    const target = device({ id: 'mat-limited', type: 'holomat', capabilities: [] });
    const plan = planSpatialScene({
      intent,
      assets: [{ id: 'mesh', requires: ['depth'] }],
      device: target,
    });
    const receipt = createSpatialAcceptanceReceipt({
      intent: plan.intent,
      sceneSpec: plan.scene,
      device: target,
    });
    expect(receipt.accepted).toBe(false);
    expect(receipt.compatibility).toEqual({ compatible: false, missing: ['depth'] });
  });

  test('rejects malformed acceptance boundaries', () => {
    expect(() => createSpatialAcceptanceReceipt()).toThrow(/normalized intent is required/);
    expect(() =>
      createSpatialAcceptanceReceipt({ intent: {}, sceneSpec: {}, device: {} }),
    ).toThrow();
  });
});
