import {
  diffRuntimeAcceptanceReceipts,
  summarizeRuntimeAcceptanceDiff,
} from '../../src/runtime/runtime-acceptance-diff.js';

const base = {
  contractVersion: 1,
  accepted: true,
  service: {
    name: 'roary-api',
    region: 'us-central1',
    latestReadyRevisionName: 'revision-a',
    traffic: [{ revisionName: 'revision-a', percent: 100, tag: null, url: null }],
    url: 'https://example.run.app',
  },
  bootstrap: {
    stage: 'readiness',
    readiness: [{ name: 'health', status: 'ready' }],
  },
  releaseEvidence: { stage: 'revision-inspect', exitCode: 0 },
};

describe('runtime acceptance semantic diff', () => {
  test('returns no changes for equivalent trusted receipts', () => {
    expect(diffRuntimeAcceptanceReceipts(base, structuredClone(base))).toEqual([]);
  });

  test('identifies a changed ready revision', () => {
    const current = structuredClone(base);
    current.service.latestReadyRevisionName = 'revision-b';

    expect(diffRuntimeAcceptanceReceipts(base, current)).toEqual([
      {
        field: 'service.latestReadyRevisionName',
        previous: 'revision-a',
        current: 'revision-b',
      },
    ]);
  });

  test('identifies multiple trusted semantic changes', () => {
    const current = structuredClone(base);
    current.service.traffic[0].percent = 90;
    current.bootstrap.readiness[0].status = 'degraded';

    expect(summarizeRuntimeAcceptanceDiff(base, current)).toMatchObject({
      changed: true,
      changeCount: 2,
      fields: ['service.traffic', 'bootstrap.readiness'],
    });
  });

  test('ignores provider diagnostics because they are not trusted fields', () => {
    const current = structuredClone(base);
    current.release = {
      stdout: 'different provider output',
      stderr: 'different diagnostic output',
      command: 'different command',
    };

    expect(diffRuntimeAcceptanceReceipts(base, current)).toEqual([]);
  });

  test('rejects malformed receipt input', () => {
    expect(() => diffRuntimeAcceptanceReceipts(null, base)).toThrow(
      'previousReceipt must be an object',
    );
    expect(() => diffRuntimeAcceptanceReceipts(base, null)).toThrow(
      'currentReceipt must be an object',
    );
  });
});
