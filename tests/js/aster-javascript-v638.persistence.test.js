import { describe, expect, jest, test } from '@jest/globals';

import { createAdaptiveDurationProgressController } from '../../Software Engineering & AI Tooling/Frontend Engineering/JavaScript/Aster JavaScript v638.js';
import { makeV638Harness } from './v638-harness.js';

function scheduling() {
  return {
    requestFrame: jest.fn(() => 1),
    cancelFrame: jest.fn(),
    now: jest.fn(() => 1000),
  };
}

describe('Aster JavaScript v638 persistence and configuration', () => {
  test('loads valid persisted estimates and clamps them to configured limits', () => {
    const controller = createAdaptiveDurationProgressController({
      minDurationMs: 100,
      maxDurationMs: 5000,
      fallbackDurationMs: 1000,
      loadEstimates: () => ({ render: 700, huge: 9000, tooSmall: 10, bad: 'nope' }),
      ...scheduling(),
    });

    expect(controller.getExpected('render')).toBe(700);
    expect(controller.getExpected('huge')).toBe(5000);
    expect(controller.getExpected('tooSmall')).toBe(1000);
    expect(controller.getExpected('bad')).toBe(1000);
  });

  test('falls back safely when loading persisted estimates throws', () => {
    const controller = createAdaptiveDurationProgressController({
      fallbackDurationMs: 1200,
      loadEstimates: () => {
        throw new Error('storage unavailable');
      },
      ...scheduling(),
    });

    expect(controller.getExpected('render')).toBe(1200);
  });

  test('uses a per-key default before falling back to the global duration', () => {
    const controller = createAdaptiveDurationProgressController({
      defaults: { render: 2400 },
      fallbackDurationMs: 1200,
      ...scheduling(),
    });

    expect(controller.getExpected('render')).toBe(2400);
    expect(controller.getExpected('upload')).toBe(1200);
  });

  test('recordSample smooths a learned duration and persists a defensive copy', () => {
    const saveEstimates = jest.fn();
    const controller = createAdaptiveDurationProgressController({
      fallbackDurationMs: 1000,
      alpha: 0.5,
      minDurationMs: 100,
      maxDurationMs: 5000,
      saveEstimates,
      ...scheduling(),
    });

    expect(controller.recordSample('render', 2000)).toBe(1500);
    expect(controller.getExpected('render')).toBe(1500);
    expect(saveEstimates).toHaveBeenCalledWith({ render: 1500 });

    const snapshot = controller.getEstimates();
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(() => {
      snapshot.render = 1;
    }).toThrow();
    expect(controller.getExpected('render')).toBe(1500);
  });

  test('invalid samples do not overwrite the current estimate', () => {
    const harness = makeV638Harness();

    expect(harness.controller.recordSample('render', 'not-a-number')).toBe(1000);
    expect(harness.controller.getEstimates()).toEqual({});
    expect(harness.saved).toHaveLength(0);
  });

  test('save failures do not break learned estimate updates', () => {
    const harness = makeV638Harness({
      saveEstimates: () => {
        throw new Error('write failed');
      },
      alpha: 1,
    });

    expect(harness.controller.recordSample('render', 800)).toBe(800);
    expect(harness.controller.getExpected('render')).toBe(800);
  });

  test('uses the platform clock when no explicit now hook is supplied', () => {
    const requestFrame = jest.fn(() => 1);
    const cancelFrame = jest.fn();
    const controller = createAdaptiveDurationProgressController({ requestFrame, cancelFrame });

    const handle = controller.start('render');

    expect(handle.startedAt).toEqual(expect.any(Number));
    expect(Number.isFinite(handle.startedAt)).toBe(true);
    controller.cancel(handle);
  });

  test.each([
    [{ defaults: [] }, 'defaults must be an object'],
    [{ loadEstimates: null }, 'estimate persistence hooks must be functions'],
    [{ saveEstimates: null }, 'estimate persistence hooks must be functions'],
    [{ now: null }, 'now must be a function'],
    [{ requestFrame: null }, 'animation-frame scheduling functions are required'],
    [{ cancelFrame: null }, 'animation-frame scheduling functions are required'],
    [{ onProgress: null }, 'progress/state hooks must be functions'],
    [{ onState: null }, 'progress/state hooks must be functions'],
  ])('rejects invalid configuration %p', (overrides, message) => {
    expect(() =>
      createAdaptiveDurationProgressController({
        ...scheduling(),
        ...overrides,
      }),
    ).toThrow(message);
  });
});
