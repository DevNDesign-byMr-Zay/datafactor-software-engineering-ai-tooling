import {
  buildRuntimeAcceptanceObservation,
  explainRuntimeAcceptanceDiff,
} from '../../src/runtime/runtime-acceptance-explanation.js';

describe('Auren consumer handoff contract', () => {
  test('keeps consumer policy outside the runtime observation', () => {
    const changes = [
      { field: 'service.latestReadyRevisionName', previous: 'a', current: 'b' },
    ];
    const observation = buildRuntimeAcceptanceObservation({
      decision: 'changed',
      changes,
    });

    expect(observation).toEqual({
      decision: 'changed',
      changed: true,
      changeCount: 1,
      summary: 'ready revision changed',
    });
    expect(Object.keys(observation)).not.toEqual(
      expect.arrayContaining(['action', 'rollback', 'retry', 'notification']),
    );
    expect(explainRuntimeAcceptanceDiff(changes)[0].message).toBe('ready revision changed');
  });
});
