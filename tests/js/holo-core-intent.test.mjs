import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretHolographicIntent } from '../../src/holo-core/intent.js';

test('interprets a normalized holographic intent', () => {
  const result = interpretHolographicIntent({
    prompt: '  Show the product as a floating presentation  ',
    sceneType: 'product',
    displayType: 'holomat',
    assetIds: ['hero', 'detail'],
    constraints: { maxDepth: 2 },
    animation: { loop: true },
  });

  assert.deepEqual(result, {
    prompt: 'Show the product as a floating presentation',
    sceneType: 'product',
    displayType: 'holomat',
    assetIds: ['hero', 'detail'],
    constraints: { maxDepth: 2 },
    animation: { loop: true },
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.assetIds), true);
});

test('applies deterministic defaults', () => {
  const result = interpretHolographicIntent({ prompt: 'show dashboard' });
  assert.equal(result.sceneType, 'presentation');
  assert.equal(result.displayType, 'projector');
  assert.deepEqual(result.assetIds, []);
  assert.deepEqual(result.constraints, {});
  assert.deepEqual(result.animation, {});
});

test('rejects unsupported intent values', () => {
  assert.throws(
    () => interpretHolographicIntent({ prompt: 'demo', sceneType: 'unknown' }),
    /Unsupported scene type/,
  );
  assert.throws(
    () => interpretHolographicIntent({ prompt: 'demo', displayType: 'screen' }),
    /Unsupported display type/,
  );
});

test('rejects malformed collections and options', () => {
  assert.throws(
    () => interpretHolographicIntent({ prompt: 'demo', assetIds: ['ok', ''] }),
    /assetIds must be an array/,
  );
  assert.throws(
    () => interpretHolographicIntent({ prompt: 'demo', constraints: [] }),
    /constraints must be an object/,
  );
  assert.throws(
    () => interpretHolographicIntent({ prompt: 'demo', animation: null }),
    /animation must be an object/,
  );
});
