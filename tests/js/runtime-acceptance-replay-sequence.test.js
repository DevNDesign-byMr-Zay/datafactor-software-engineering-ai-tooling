import {
  buildRuntimeAcceptanceObservation,
  decideRuntimeAcceptanceChange,
  fingerprintRuntimeAcceptanceReceipt,
  RUNTIME_ACCEPTANCE_DECISIONS,
} from '../../src/index.js';

describe('runtime acceptance replay sequence', () => {
  const accepted = (revision) => ({ accepted: true, revision });
  const rejected = () => ({ accepted: false, reason: 'not trusted' });

  test('replays trusted state without allowing rejection to become state', () => {
    const first = accepted('revision-a');
    const second = accepted('revision-b');
    const firstFingerprint = fingerprintRuntimeAcceptanceReceipt(first);

    const sequence = [
      decideRuntimeAcceptanceChange(first, null),
      decideRuntimeAcceptanceChange(rejected(), firstFingerprint),
      decideRuntimeAcceptanceChange(second, firstFingerprint),
      decideRuntimeAcceptanceChange(first, firstFingerprint),
    ];

    expect(sequence).toEqual([
      RUNTIME_ACCEPTANCE_DECISIONS.CHANGED,
      RUNTIME_ACCEPTANCE_DECISIONS.REJECTED,
      RUNTIME_ACCEPTANCE_DECISIONS.CHANGED,
      RUNTIME_ACCEPTANCE_DECISIONS.UNCHANGED,
    ]);

    const observation = buildRuntimeAcceptanceObservation({
      decision: sequence.at(-1),
      changes: [],
    });
    expect(observation.decision).toBe('unchanged');
  });
});
