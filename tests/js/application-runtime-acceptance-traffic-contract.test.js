import { executeApplicationRuntimeAcceptance } from '../../src/runtime/application-runtime-acceptance.js';
import { createApplicationBootstrapPlan } from '../../src/bootstrap/package-manifest.js';

const plan = createApplicationBootstrapPlan({
  frontendManifest: {
    name: 'trainer-web',
    version: '0.0.1',
    private: true,
    type: 'module',
    scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
  },
  backendManifest: {
    name: 'ai-service',
    version: '0.2.0',
    type: 'module',
    scripts: {
      start: 'node index.mjs',
      dev: 'NODE_ENV=development node index.mjs',
    },
    engines: { node: '>=18' },
  },
  mode: 'production',
});

function executeStepImpl(step) {
  return Promise.resolve(step.phase === 'run' ? { state: 'started', pid: 4100 } : { code: 0 });
}

function serviceJson(traffic) {
  return JSON.stringify({
    metadata: { name: 'roary-api' },
    status: {
      latestReadyRevisionName: 'roary-api-00042-abc',
      url: 'https://roary-api.example.run.app',
      traffic,
    },
  });
}

function executeWithTraffic(traffic, stderr = '') {
  const stdout = serviceJson(traffic);
  return executeApplicationRuntimeAcceptance(plan, {
    serviceName: 'roary-api',
    executeStepImpl,
    probeReadinessImpl: async () => ({ ok: true, status: 'ready' }),
    execFile: async () => ({ exitCode: 0, stdout, stderr }),
  });
}

describe('application runtime acceptance traffic contract', () => {
  test('accepts a valid gradual rollout while keeping the latest ready revision positive', async () => {
    const result = await executeWithTraffic([
      { revisionName: 'roary-api-00042-abc', percent: 5, tag: 'canary' },
      { revisionName: 'roary-api-00041-old', percent: 95 },
      { revisionName: 'roary-api-00040-tagged', tag: 'preview' },
    ]);

    expect(result.accepted).toBe(true);
    expect(result.release.service.traffic).toEqual([
      expect.objectContaining({ revisionName: 'roary-api-00042-abc', percent: 5 }),
      expect.objectContaining({ revisionName: 'roary-api-00041-old', percent: 95 }),
      expect.objectContaining({ revisionName: 'roary-api-00040-tagged', percent: null }),
    ]);
    expect(result.receiptFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  test('fails closed when parsed traffic percentages over-allocate routing', async () => {
    const traffic = [
      { revisionName: 'roary-api-00042-abc', percent: 60 },
      { revisionName: 'roary-api-00041-old', percent: 50 },
    ];
    const stdout = serviceJson(traffic);

    let failure;
    try {
      await executeWithTraffic(traffic, 'traffic-shape-debug');
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({
      stage: 'release-evidence',
      message: expect.stringContaining('routed percent must total 100; received 110'),
      releaseEvidence: expect.objectContaining({
        stage: 'revision-inspect',
        exitCode: 0,
        stdout,
        stderr: 'traffic-shape-debug',
      }),
    });
    expect(failure).not.toHaveProperty('receipt');
    expect(failure).not.toHaveProperty('receiptFingerprint');
  });

  test('fails closed when parsed traffic percentages leave routing incomplete', async () => {
    const traffic = [
      { revisionName: 'roary-api-00042-abc', percent: 5, tag: 'canary' },
      { revisionName: 'roary-api-00041-old', percent: 90 },
    ];

    await expect(executeWithTraffic(traffic)).rejects.toMatchObject({
      stage: 'release-evidence',
      message: expect.stringContaining('routed percent must total 100; received 95'),
    });
  });
});
