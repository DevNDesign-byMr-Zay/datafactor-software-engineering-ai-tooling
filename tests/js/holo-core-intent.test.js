import { describe, expect, test } from '@jest/globals';

import { interpretHolographicIntent } from '../../src/holo-core/intent.js';

describe('HoloCore holographic intent', () => {
  test('normalizes holographic intent into a stable planning boundary', () => {
    const intent = interpretHolographicIntent({
      prompt: 'Turn this product into a floating 3D presentation.',
      sceneType: 'product',
      displayType: 'three-d-platform',
      assetIds: ['product-hero'],
      constraints: { maxNodes: 8 },
      animation: { loop: true },
    });

    expect(intent).toEqual({
      prompt: 'Turn this product into a floating 3D presentation.',
      sceneType: 'product',
      displayType: 'three-d-platform',
      assetIds: ['product-hero'],
      constraints: { maxNodes: 8 },
      animation: { loop: true },
      interaction: null,
    });
    expect(Object.isFrozen(intent)).toBe(true);
    expect(Object.isFrozen(intent.assetIds)).toBe(true);
  });

  test('normalizes renderer-neutral interaction intent for downstream adapters', () => {
    expect(
      interpretHolographicIntent({
        prompt: 'Orbit around the hero product.',
        interaction: { type: 'orbit', deltaYaw: 18, deltaPitch: -4 },
      }).interaction,
    ).toEqual({ type: 'orbit', deltaYaw: 18, deltaPitch: -4 });

    expect(
      interpretHolographicIntent({
        prompt: 'Focus the selected product.',
        interaction: { type: 'focus', nodeId: 'hero-product' },
      }).interaction,
    ).toEqual({ type: 'focus', nodeId: 'hero-product' });
  });

  test('fails closed on malformed interaction parameters', () => {
    expect(() =>
      interpretHolographicIntent({
        prompt: 'Zoom the scene.',
        interaction: { type: 'zoom', delta: Number.NaN },
      }),
    ).toThrow(/delta/);

    expect(() =>
      interpretHolographicIntent({
        prompt: 'Select something.',
        interaction: { type: 'select', nodeId: '' },
      }),
    ).toThrow(/nodeId/);

    expect(() =>
      interpretHolographicIntent({
        prompt: 'Do an unsupported gesture.',
        interaction: { type: 'spin' },
      }),
    ).toThrow(/Unsupported spatial interaction type/);
  });

  test('rejects invalid display and malformed asset input', () => {
    expect(() => interpretHolographicIntent({ prompt: 'demo', displayType: 'screen' })).toThrow(
      /Unsupported display type/,
    );
    expect(() => interpretHolographicIntent({ prompt: 'demo', assetIds: [''] })).toThrow(
      /assetIds/,
    );
  });
});
