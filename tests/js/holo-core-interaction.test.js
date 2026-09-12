import { describe, expect, test } from '@jest/globals';

import { normalizeSpatialInteractionIntent } from '../../src/holo-core/interaction.js';

describe('HoloCore spatial interaction intent', () => {
  test('normalizes immutable orbit pan and zoom actions', () => {
    const orbit = normalizeSpatialInteractionIntent({
      type: 'orbit',
      deltaYaw: 12,
      deltaPitch: -4,
    });
    const pan = normalizeSpatialInteractionIntent({ type: 'pan', x: 1, y: -2 });
    const zoom = normalizeSpatialInteractionIntent({ type: 'zoom', delta: -0.5 });

    expect(orbit).toEqual({ type: 'orbit', deltaYaw: 12, deltaPitch: -4 });
    expect(pan).toEqual({ type: 'pan', x: 1, y: -2, z: 0 });
    expect(zoom).toEqual({ type: 'zoom', delta: -0.5 });
    expect(Object.isFrozen(orbit)).toBe(true);
  });

  test('normalizes select and focus node identifiers', () => {
    expect(normalizeSpatialInteractionIntent({ type: 'select', nodeId: ' hero ' })).toEqual({
      type: 'select',
      nodeId: 'hero',
    });
    expect(normalizeSpatialInteractionIntent({ type: 'focus', nodeId: 'node-2' })).toEqual({
      type: 'focus',
      nodeId: 'node-2',
    });
  });

  test('normalizes clear-selection without carrying unrelated fields', () => {
    expect(
      normalizeSpatialInteractionIntent({
        type: 'clear-selection',
        nodeId: 'ignored',
        delta: 99,
      }),
    ).toEqual({ type: 'clear-selection' });
  });

  test('fails closed for unsupported or malformed interactions', () => {
    expect(() => normalizeSpatialInteractionIntent({ type: 'teleport' })).toThrow(
      /Unsupported spatial interaction type/,
    );
    expect(() => normalizeSpatialInteractionIntent({ type: 'zoom', delta: Number.NaN })).toThrow(
      /delta must be a finite number/,
    );
    expect(() => normalizeSpatialInteractionIntent({ type: 'select', nodeId: ' ' })).toThrow(
      /nodeId must be a non-empty string/,
    );
    expect(() => normalizeSpatialInteractionIntent([])).toThrow(
      /interaction intent must be an object/,
    );
  });
});
