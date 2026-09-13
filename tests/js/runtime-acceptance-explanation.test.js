import { explainRuntimeAcceptanceDiff } from '../../src/runtime/runtime-acceptance-explanation.js';

describe('runtime acceptance explanation', () => {
  test('turns trusted fields into concise explanations', () => {
    expect(explainRuntimeAcceptanceDiff([
      {
        field: 'service.latestReadyRevisionName',
        previous: 'revision-a',
        current: 'revision-b',
      },
      {
        field: 'service.traffic',
        previous: [{ revisionName: 'revision-a', percent: 100 }],
        current: [{ revisionName: 'revision-b', percent: 100 }],
      },
    ])).toEqual([
      {
        field: 'service.latestReadyRevisionName',
        label: 'ready revision',
        message: 'ready revision changed',
        previous: 'revision-a',
        current: 'revision-b',
      },
      {
        field: 'service.traffic',
        label: 'traffic allocation',
        message: 'traffic allocation changed',
        previous: [{ revisionName: 'revision-a', percent: 100 }],
        current: [{ revisionName: 'revision-b', percent: 100 }],
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

  test('rejects malformed changes input', () => {
    expect(() => explainRuntimeAcceptanceDiff(null)).toThrow('changes must be an array');
  });
});
