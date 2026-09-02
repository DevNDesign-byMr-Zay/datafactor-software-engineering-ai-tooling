import { jest } from '@jest/globals';

import { createAdaptiveDurationProgressController } from '../../Software Engineering & AI Tooling/Frontend Engineering/JavaScript/Aster JavaScript v638.js';

export function makeV638Harness(options = {}) {
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
    onState: (state, handle, detail) =>
      stateEvents.push({ state, progress: handle.progress, detail }),
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
    pendingFrames: frameCallbacks,
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
