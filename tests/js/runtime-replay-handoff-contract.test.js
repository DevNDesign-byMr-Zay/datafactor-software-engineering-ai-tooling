import { buildRuntimeAcceptanceObservation } from '../../src/index.js';

describe('runtime replay handoff contract', () => {
  test('consumer observation remains descriptive and policy-free', () => {
    const observation = buildRuntimeAcceptanceObservation({
      decision: 'unchanged',
      changes: [],
    });

    expect(observation).toEqual({
      decision: 'unchanged',
      changed: false,
      changeCount: 0,
      summary: 'No trusted acceptance changes detected.',
    });
    expect(Object.keys(observation)).not.toEqual(
      expect.arrayContaining(['fingerprint', 'action', 'rollback', 'retry']),
    );
  });
});
