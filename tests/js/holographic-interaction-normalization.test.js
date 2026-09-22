import { describe, expect, test } from '@jest/globals';

import {
  INTERACTION_TYPES,
  normalizeHolographicInteraction,
} from '../../src/holographic/interaction-normalization.js';

describe('renderer-neutral holographic interaction normalization', () => {
  test('normalizes orbit, pan, zoom, selection, focus, and clear-selection intents', () => {
    expect(
      normalizeHolographicInteraction({
        type: ' orbit ',
        deltaYaw: 4,
        deltaPitch: -2,
      }),
    ).toEqual({ type: 'orbit', deltaYaw: 4, deltaPitch: -2 });

    expect(normalizeHolographicInteraction({ type: 'pan', x: 1 })).toEqual({
      type: 'pan',
      x: 1,
      y: 0,
      z: 0,
    });
    expect(normalizeHolographicInteraction({ type: 'zoom' })).toEqual({
      type: 'zoom',
      delta: 0,
    });
    expect(normalizeHolographicInteraction({ type: 'select', nodeId: ' asset-1 ' })).toEqual({
      type: 'select',
      nodeId: 'asset-1',
    });
    expect(normalizeHolographicInteraction({ type: 'focus', nodeId: 'node-2' })).toEqual({
      type: 'focus',
      nodeId: 'node-2',
    });
    expect(normalizeHolographicInteraction({ type: 'clear-selection' })).toEqual({
      type: 'clear-selection',
    });
  });

  test('returns immutable interaction evidence and a frozen vocabulary', () => {
    const result = normalizeHolographicInteraction({
      type: 'orbit',
      deltaYaw: 1,
      deltaPitch: 2,
    });

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(INTERACTION_TYPES)).toBe(true);
    expect(INTERACTION_TYPES).toEqual([
      'orbit',
      'pan',
      'zoom',
      'select',
      'focus',
      'clear-selection',
    ]);
  });

  test('rejects unsupported types and unexpected fields', () => {
    expect(() =>
      normalizeHolographicInteraction({
        type: 'teleport',
      }),
    ).toThrow(/unsupported holographic interaction type/);

    expect(() =>
      normalizeHolographicInteraction({
        type: 'zoom',
        delta: 1,
        execute: true,
      }),
    ).toThrow(/unsupported field: execute/);
  });

  test.each([
    [{ type: 'orbit', deltaYaw: '4' }, 'interaction.deltaYaw'],
    [{ type: 'orbit', deltaPitch: true }, 'interaction.deltaPitch'],
    [{ type: 'pan', x: Number.NaN }, 'interaction.x'],
    [{ type: 'pan', y: Number.POSITIVE_INFINITY }, 'interaction.y'],
    [{ type: 'zoom', delta: '1' }, 'interaction.delta'],
  ])('rejects non-finite or coerced numeric input %#', (input, message) => {
    expect(() => normalizeHolographicInteraction(input)).toThrow(message);
  });

  test('rejects blank selection identity instead of guessing a target', () => {
    expect(() =>
      normalizeHolographicInteraction({
        type: 'select',
        nodeId: '   ',
      }),
    ).toThrow(/interaction.nodeId must be a non-empty string/);
  });

  test('rejects accessors without executing them', () => {
    let reads = 0;
    const input = {};
    Object.defineProperty(input, 'type', {
      enumerable: true,
      get() {
        reads += 1;
        return 'zoom';
      },
    });

    expect(() => normalizeHolographicInteraction(input)).toThrow(
      /interaction.type must be enumerable data/,
    );
    expect(reads).toBe(0);
  });

  test('rejects inherited and symbol-backed interaction evidence', () => {
    expect(() =>
      normalizeHolographicInteraction(Object.create({ type: 'clear-selection' })),
    ).toThrow(/must be a plain object/);

    const input = { type: 'clear-selection' };
    input[Symbol('hidden-authority')] = true;
    expect(() => normalizeHolographicInteraction(input)).toThrow(/symbol properties/);
  });

  test('requires node identity only for interaction types that address a node', () => {
    expect(() => normalizeHolographicInteraction({ type: 'select' })).toThrow(
      /interaction.nodeId must be a non-empty string/,
    );
    expect(() => normalizeHolographicInteraction({ type: 'focus' })).toThrow(
      /interaction.nodeId must be a non-empty string/,
    );
    expect(normalizeHolographicInteraction({ type: 'orbit' })).toEqual({
      type: 'orbit',
      deltaYaw: 0,
      deltaPitch: 0,
    });
  });
});
