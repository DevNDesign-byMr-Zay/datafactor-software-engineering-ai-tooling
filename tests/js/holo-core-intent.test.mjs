import assert from 'node:assert/strict';
import test from 'node:test';

import { interpretHolographicIntent } from '../../src/holo-core/intent.js';

test('normalizes holographic intent into a stable planning boundary', () => {
  const intent = interpretHolographicIntent({
    prompt: 'Turn this product into a floating 3D presentation.',
    sceneType: 'product',
    displayType: 'three-d-platform',
    assetIds: ['product-hero'],
    constraints: { maxNodes: 8 },
    animation: { loop: true },
  });

  assert.deepEqual(intent, {
    prompt: 'Turn this product into a floating 3D presentation.',
    sceneType: 'product',
    displayType: 'three-d-platform',
    assetIds: ['product-hero'],
    constraints: { maxNodes: 8 },
    animation: { loop: true },
  });
  assert(Object.isFrozen(intent));
  assert(Object.isFrozen(intent.assetIds));
});

test('rejects invalid display and malformed asset input', () => {
  assert.throws(() => interpretHolographicIntent({ prompt: 'demo', displayType: 'screen' }), /Unsupported display type/);
  assert.throws(() => interpretHolographicIntent({ prompt: 'demo', assetIds: [''] }), /assetIds/);
});
