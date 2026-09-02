import { describe, expect, jest, test } from '@jest/globals';

import { createAdaptiveDurationProgressController } from '../../Software Engineering & AI Tooling/Frontend Engineering/JavaScript/Aster JavaScript v638.js';

function makeHarness(options = {}) {
  let clock = 1000;
  let nextFrameId = 1;
  const frameCallbacks = new Map();
  const progressEvents = [];
  const stateEvents = [];
  const saved = [];

  const requestFrame = jest.fn((callback) => {
    const id = nextFrameId++;
    frameCallbacks.set(id, callback);
    return id;
  });
  const cancelFrame = jest.fn((id) => frameCallbacks.delete(id));

  const controller = createAdaptiveDurationProgressController({
    fallbackDurationMs: 1000,
    minDurationMs: 100,
    maxDurationMs: 5000,
    progressCeiling: 0.8,
    initialProgress: 0.1,
    now: () => clock,
    requestFrame,
    cancelFrame,
    onProgress: (progress, handle) => progressEvents.push({ progress, state: handle.state }),
    onState: (state, handle) => stateEvents.push({ state, progress: handle.progress }),
    saveEstimates: (estimates) => saved.push(estimates),
    ...options,
  });

  return {
    controller,
    requestFrame,
    cancelFrame,
    progressEvents,
    stateEvents,
    saved,
    setClock(value) {
      clock = value;
    },
    runNextFrame() {
      const [id, callback] = frameCallbacks.entries().next().value ?? [];
      if (!callback) return false;
      frameCallbacks.delete(id);
      callback();
      return true;
    },
  };
}

describe('Aster JavaScript v638 adaptive progress controller', () => {
  test('start emits running state and progress remains clamped below the ceiling', () => {
    const harness = makeHarness();
    const handle = harness.controller.start('render');

    expect(handle.state).toBe('running');
    expect(handle.progress).toBe(0.1);
    expect(harness.requestFrame).toHaveBeenCalledTimes(1);

    harness.setClock(10000);
    expect(harness.runNextFrame()).toBe(true);

    expect(handle.progress).toBeLessThanOrEqual(0.8);
    expect(handle.progress).toBeGreaterThanOrEqual(0.1);
    expect(harness.progressEvents.every(({ progress }) => progress >= 0 && progress <= 1)).toBe(true);
  });

  test('finish transitions to done, emits 100 percent, and learns a duration sample', () => {
    const harness = makeHarness();
    const handle = harness.controller.start('analysis');

    harness.setClock(1800);
    harness.controller.finish(handle);

    expect(handle.active).toBe(false);
    expect(handle.state).toBe('done');
    expect(handle.progress).toBe(1);
    expect(handle.elapsedMs).toBe(800);
    expect(handle.sampled).toBe(true);
    expect(harness.saved).toHaveLength(1);
    expect(harness.controller.getExpected('analysis')).toBeCloseTo(956, 5);
  });

  test('cancel transitions to cancelled without recording a learned sample', () => {
    const harness = makeHarness();
    const handle = harness.controller.start('upload');

    harness.setClock(1300);
    harness.controller.cancel(handle, { reason: 'user' });

    expect(handle.active).toBe(false);
    expect(handle.state).toBe('cancelled');
    expect(handle.elapsedMs).toBe(300);
    expect(handle.sampled).toBe(false);
    expect(harness.saved).toHaveLength(0);
    expect(harness.cancelFrame).toHaveBeenCalled();
    expect(harness.stateEvents.at(-1).state).toBe('cancelled');
  });
});
