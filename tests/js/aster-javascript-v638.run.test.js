import { describe, expect, test } from '@jest/globals';

import { makeV638Harness } from './v638-harness.js';

describe('Aster JavaScript v638 async execution and lifecycle edges', () => {
  test('run resolves a task value and finishes the handle as done', async () => {
    const harness = makeV638Harness();
    let observedHandle;

    const result = await harness.controller.run('render', async (handle) => {
      observedHandle = handle;
      harness.setClock(1600);
      return { ok: true };
    });

    expect(result).toEqual({ ok: true });
    expect(observedHandle.state).toBe('done');
    expect(observedHandle.active).toBe(false);
    expect(observedHandle.progress).toBe(1);
    expect(observedHandle.sampled).toBe(true);
  });

  test('run marks failed state and rethrows the original task error', async () => {
    const harness = makeV638Harness();
    const failure = new Error('render failed');
    let observedHandle;

    await expect(
      harness.controller.run('render', async (handle) => {
        observedHandle = handle;
        harness.setClock(1400);
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(observedHandle.state).toBe('failed');
    expect(observedHandle.active).toBe(false);
    expect(harness.stateEvents.at(-1).detail.error).toBe(failure);
  });

  test('run can disable learning for a successful task', async () => {
    const harness = makeV638Harness();
    let observedHandle;

    await harness.controller.run(
      'render',
      async (handle) => {
        observedHandle = handle;
        harness.setClock(1800);
        return 'done';
      },
      { learn: false },
    );

    expect(observedHandle.sampled).toBe(false);
    expect(harness.saved).toHaveLength(0);
    expect(harness.controller.getExpected('render')).toBe(1000);
  });

  test('run rejects non-functions before starting a task', async () => {
    const harness = makeV638Harness();

    await expect(harness.controller.run('render', null)).rejects.toThrow('fn must be a function');
    expect(harness.requestFrame).not.toHaveBeenCalled();
  });

  test('finish supports failed state without learning', () => {
    const harness = makeV638Harness();
    const handle = harness.controller.start('render');

    harness.setClock(1250);
    harness.controller.finish(handle, {
      ok: false,
      learn: false,
      detail: { code: 'FAILED_RENDER' },
    });

    expect(handle.state).toBe('failed');
    expect(handle.sampled).toBe(false);
    expect(harness.stateEvents.at(-1).detail).toEqual({ code: 'FAILED_RENDER', elapsedMs: 250 });
  });

  test('finish and cancel are idempotent for inactive handles', () => {
    const harness = makeV638Harness();
    const handle = harness.controller.start('render');

    harness.controller.cancel(handle);
    const statesAfterCancel = harness.stateEvents.length;

    expect(harness.controller.finish(handle)).toBe(handle);
    expect(harness.controller.cancel(handle)).toBe(handle);
    expect(harness.stateEvents).toHaveLength(statesAfterCancel);
    expect(harness.controller.finish(null)).toBeNull();
    expect(harness.controller.cancel(null)).toBeNull();
  });

  test('disconnect prevents new work and stops existing animation progress', () => {
    const harness = makeV638Harness();
    const handle = harness.controller.start('render');
    const progressBeforeDisconnect = harness.progressEvents.length;

    harness.controller.disconnect();
    harness.setClock(1500);

    expect(harness.runNextFrame()).toBe(true);
    expect(harness.progressEvents).toHaveLength(progressBeforeDisconnect);
    expect(handle.active).toBe(true);
    expect(() => harness.controller.start('upload')).toThrow('controller is disconnected');
  });

  test('long-running tasks stretch their expected duration before hitting the ceiling', () => {
    const harness = makeV638Harness();
    const handle = harness.controller.start('render');
    const initialExpected = handle.expectedMs;

    harness.setClock(2500);
    harness.runNextFrame();

    expect(handle.expectedMs).toBeGreaterThan(initialExpected);
    expect(handle.expectedMs).toBeLessThanOrEqual(5000);
    expect(handle.progress).toBeLessThanOrEqual(0.8);
  });
});
