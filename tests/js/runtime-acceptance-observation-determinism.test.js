import { buildRuntimeAcceptanceObservation } from '../../src/runtime/runtime-acceptance-explanation.js';

describe('runtime acceptance observation determinism', () => {
  test('same decision and changes produce the same observation', () => {
    const changes = [
      { field: 'service.latestReadyRevisionName', previous: 'a', current: 'b' },
      { field: 'bootstrap.readiness', previous: [{ status: 'ready' }], current: [{ status: 'degraded' }] },
    ];

    const first = buildRuntimeAcceptanceObservation({ decision: 'changed', changes });
    const second = buildRuntimeAcceptanceObservation({ decision: 'changed', changes });

    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});
