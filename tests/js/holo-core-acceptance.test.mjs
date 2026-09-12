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
    const target = device({
      id: 'projector-1',
      type: 'projector',
      capabilities: ['depth'],
    });
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
    const plan = planSpatialScene({
      intent,
      assets: [{ id: 'diagram' }],
      device: target,
    });
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
});
