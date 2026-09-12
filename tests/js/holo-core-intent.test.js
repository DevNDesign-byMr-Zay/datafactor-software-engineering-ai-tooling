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
    });
    expect(Object.isFrozen(intent)).toBe(true);
    expect(Object.isFrozen(intent.assetIds)).toBe(true);
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
