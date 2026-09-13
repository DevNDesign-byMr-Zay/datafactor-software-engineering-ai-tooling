export const runtimeAcceptanceConsumerFixture = Object.freeze({
  contractVersion: 1,
  accepted: true,
  service: Object.freeze({
    name: 'roary-api',
    region: 'us-central1',
    latestReadyRevisionName: 'roary-api-00042-abc',
    traffic: Object.freeze([
      Object.freeze({
        revisionName: 'roary-api-00042-abc',
        percent: 90,
        tag: null,
        url: null,
      }),
      Object.freeze({
        revisionName: 'roary-api-00041-xyz',
        percent: 10,
        tag: 'canary',
        url: null,
      }),
    ]),
    url: null,
  }),
  bootstrap: Object.freeze({
    stage: 'readiness',
    readiness: Object.freeze([
      Object.freeze({ name: 'health', status: 'ready' }),
      Object.freeze({ name: 'dependencies', status: 'ready' }),
    ]),
  }),
  releaseEvidence: Object.freeze({
    stage: 'revision-inspect',
    exitCode: 0,
  }),
});
