import {
  buildRuntimeAcceptanceObservation,
  decideRuntimeAcceptanceChange,
  RUNTIME_ACCEPTANCE_DECISIONS,
} from '../../src/index.js';

describe('runtime acceptance rejection replay', () => {
  test('keeps rejected observations out of trusted change state', () => {
    const rejected = {
      accepted: false,
      reason: 'readiness failed',
      stdout: 'provider output should not become trusted state',
    };

    const decision = decideRuntimeAcceptanceChange(rejected, 'prior-fingerprint');
    const observation = buildRuntimeAcceptanceObservation({
      decision,
      changes: [],
    });

    expect(decision).toBe(RUNTIME_ACCEPTANCE_DECISIONS.REJECTED);
    expect(observation).toEqual({
      decision: 'rejected',
      changed: false,
      changeCount: 0,
      summary: 'No trusted acceptance changes detected.',
    });
    expect(JSON.stringify(observation)).not.toContain('provider output');
  });
});
