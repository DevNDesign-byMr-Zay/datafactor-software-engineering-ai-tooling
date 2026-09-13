import { summarizeRuntimeAcceptanceExplanation } from '../../src/index.js';

describe('runtime acceptance summary', () => {
  test('returns a stable no-change summary', () => {
    expect(summarizeRuntimeAcceptanceExplanation([])).toBe(
      'No trusted acceptance changes detected.',
    );
  });

  test('joins semantic explanations deterministically', () => {
    expect(summarizeRuntimeAcceptanceExplanation([
      { field: 'service.latestReadyRevisionName', previous: 'a', current: 'b' },
      { field: 'bootstrap.readiness', previous: 'ready', current: 'degraded' },
    ])).toBe('ready revision changed; readiness changed');
  });

  test('does not expose arbitrary diagnostic text', () => {
    const summary = summarizeRuntimeAcceptanceExplanation([
      {
        field: 'service.latestReadyRevisionName',
        previous: 'a',
        current: 'b; stderr=secret; command=deploy',
      },
    ]);

    expect(summary).toBe('ready revision changed');
    expect(summary).not.toContain('secret');
    expect(summary).not.toContain('deploy');
  });
});
