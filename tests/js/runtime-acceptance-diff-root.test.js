import {
  diffRuntimeAcceptanceReceipts,
  summarizeRuntimeAcceptanceDiff,
} from '../../src/index.js';

const receipt = {
  contractVersion: 1,
  accepted: true,
  service: {
    name: 'roary-api',
    region: 'us-central1',
    latestReadyRevisionName: 'revision-a',
    traffic: [],
    url: null,
  },
  bootstrap: { stage: 'readiness', readiness: [] },
  releaseEvidence: { stage: 'revision-inspect', exitCode: 0 },
};

describe('runtime acceptance diff package surface', () => {
  test('exports semantic diff helpers from the package root', () => {
    expect(diffRuntimeAcceptanceReceipts).toEqual(expect.any(Function));
    expect(summarizeRuntimeAcceptanceDiff).toEqual(expect.any(Function));
  });

  test('reports no change for an equivalent receipt', () => {
    expect(summarizeRuntimeAcceptanceDiff(receipt, structuredClone(receipt))).toMatchObject({
      changed: false,
      changeCount: 0,
      fields: [],
    });
  });
});
