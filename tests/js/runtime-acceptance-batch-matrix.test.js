import { buildRuntimeAcceptanceObservation } from '../../src/runtime/runtime-acceptance-explanation.js';

describe('runtime acceptance batch matrix', () => {
  test.each([
    ['first', 'changed', 0, false],
    ['stable', 'unchanged', 0, false],
    ['rollout', 'changed', 2, true],
    ['readiness regression', 'changed', 1, true],
  ])('%s observation stays compact and policy-free', (_name, decision, changeCount, changed) => {
    const changes = Array.from({ length: changeCount }, (_, index) => ({
      field: `trusted.field.${index}`,
      previous: index,
      current: index + 1,
    }));

    const observation = buildRuntimeAcceptanceObservation({ decision, changes });

    expect(observation).toMatchObject({ decision, changed, changeCount });
    expect(Object.keys(observation)).toEqual(['decision', 'changed', 'changeCount', 'summary']);
  });
});
