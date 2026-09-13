import {
  buildRuntimeAcceptanceObservation,
  explainRuntimeAcceptanceDiff,
  summarizeRuntimeAcceptanceExplanation,
} from '../../src/runtime/runtime-acceptance-explanation.js';

describe('runtime acceptance explanation', () => {
  test('turns trusted fields into concise explanations', () => {
    expect(explainRuntimeAcceptanceDiff([
      {
        field: 'service.latestReadyRevisionName',
        previous: 'revision-a',
        current: 'revision-b',
      },
    ])).toEqual([
      {
        field: 'service.latestReadyRevisionName',
        label: 'ready revision',
        message: 'ready revision changed',
        previous: 'revision-a',
        current: 'revision-b',
      },
    ]);
  });

  test('preserves unknown fields without inventing semantics', () => {
    expect(explainRuntimeAcceptanceDiff([
      { field: 'future.field', previous: 1, current: 2 },
    ])).toEqual([
      {
        field: 'future.field',
        label: 'future.field',
        message: 'future.field changed',
        previous: 1,
        current: 2,
      },
    ]);
  });

  test('summarizes multiple changes deterministically', () => {
    expect(summarizeRuntimeAcceptanceExplanation([
      { field: 'service.traffic', previous: [], current: [] },
      { field: 'bootstrap.readiness', previous: [], current: [] },
    ])).toBe('traffic allocation changed; readiness changed');
  });

  test('builds a frozen structured observation without adding policy', () => {
    const observation = buildRuntimeAcceptanceObservation({
      decision: 'changed',
      changes: [{ field: 'service.url', previous: 'a', current: 'b' }],
    });

    expect(observation).toEqual({
      decision: 'changed',
      changed: true,
      changeCount: 1,
      summary: 'service URL changed',
    });
    expect(Object.isFrozen(observation)).toBe(true);
  });

  test('rejects malformed changes input', () => {
    expect(() => explainRuntimeAcceptanceDiff(null)).toThrow('changes must be an array');
    expect(() => buildRuntimeAcceptanceObservation({ decision: '', changes: [] }))
      .toThrow('decision must be a non-empty string');
  });
});
