import { executeApplicationRuntimeAcceptance } from '../../src/runtime/application-runtime-acceptance.js';
import { createApplicationBootstrapPlan } from '../../src/bootstrap/package-manifest.js';

const backendManifest = {
  name: 'ai-service',
  version: '0.2.0',
  type: 'module',
  scripts: {
    start: 'node index.mjs',
    dev: 'NODE_ENV=development node index.mjs',
  },
  engines: { node: '>=18' },
};

const frontendManifest = {
  name: 'trainer-web',
  version: '0.0.1',
  private: true,
  type: 'module',
  scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
};

const plan = createApplicationBootstrapPlan({
  frontendManifest,
  backendManifest,
  mode: 'production',
});

const SERVICE_JSON = JSON.stringify({
  metadata: { name: 'roary-api' },
  status: {
    latestReadyRevisionName: 'roary-api-00042-abc',
    url: 'https://roary-api.example.run.app',
    traffic: [{ revisionName: 'roary-api-00042-abc', percent: 100 }],
  },
});

function executeStepImpl(step) {
  return Promise.resolve(step.phase === 'run' ? { state: 'started', pid: 4100 } : { code: 0 });
}

describe('application runtime acceptance', () => {
  test('joins bootstrap readiness with release evidence and emits a durable receipt fingerprint', async () => {
    const execFile = async (command, args) => {
      expect(command).toBe('gcloud');
      expect(args).toContain('roary-api');
      return { exitCode: 0, stdout: SERVICE_JSON, stderr: 'provider-noise' };
    };

    const result = await executeApplicationRuntimeAcceptance(plan, {
      serviceName: 'roary-api',
      executeStepImpl,
      probeReadinessImpl: async () => ({ ok: true, status: 'ready' }),
      execFile,
    });

    expect(result.accepted).toBe(true);
    expect(result.bootstrap).toMatchObject({
      ready: true,
      started: ['backend:run'],
    });
    expect(result.release).toMatchObject({
      stage: 'revision-inspect',
      stderr: 'provider-noise',
      service: {
        serviceName: 'roary-api',
        latestReadyRevisionName: 'roary-api-00042-abc',
      },
    });
    expect(result.receipt).toMatchObject({
      accepted: true,
      service: {
        name: 'roary-api',
        latestReadyRevisionName: 'roary-api-00042-abc',
        traffic: [{ revisionName: 'roary-api-00042-abc', percent: 100 }],
      },
      bootstrap: {
        readiness: [{ name: 'backend:run', status: 'ready' }],
      },
      releaseEvidence: {
        stage: 'revision-inspect',
        exitCode: 0,
      },
    });
    expect(result.receiptFingerprint).toMatch(/^[a-f0-9]{64}$/);

    const durableReceipt = JSON.stringify(result.receipt);
    expect(durableReceipt).not.toContain('provider-noise');
    expect(durableReceipt).not.toContain('--format=json');
    expect(durableReceipt).not.toContain('gcloud');
  });

  test('fails closed on invalid service configuration before bootstrap or release work starts', async () => {
    let executeCalls = 0;
    let releaseCalls = 0;

    await expect(
      executeApplicationRuntimeAcceptance(plan, {
        serviceName: '   ',
        executeStepImpl: async (step) => {
          executeCalls += 1;
          return executeStepImpl(step);
        },
        probeReadinessImpl: async () => ({ ok: true }),
        execFile: async () => {
          releaseCalls += 1;
          return { exitCode: 0, stdout: SERVICE_JSON, stderr: '' };
        },
      }),
    ).rejects.toMatchObject({
      message:
        'application runtime acceptance failed at configuration: serviceName must be a non-empty string',
      stage: 'configuration',
      field: 'serviceName',
      bootstrap: null,
    });

    expect(executeCalls).toBe(0);
    expect(releaseCalls).toBe(0);
  });

  test('fails closed on an explicitly blank region before bootstrap or release work starts', async () => {
    let executeCalls = 0;
    let releaseCalls = 0;

    await expect(
      executeApplicationRuntimeAcceptance(plan, {
        serviceName: 'roary-api',
        region: '   ',
        executeStepImpl: async (step) => {
          executeCalls += 1;
          return executeStepImpl(step);
        },
        probeReadinessImpl: async () => ({ ok: true }),
        execFile: async () => {
          releaseCalls += 1;
          return { exitCode: 0, stdout: SERVICE_JSON, stderr: '' };
        },
      }),
    ).rejects.toMatchObject({
      message:
        'application runtime acceptance failed at configuration: region must be a non-empty string',
      stage: 'configuration',
      field: 'region',
      bootstrap: null,
    });

    expect(executeCalls).toBe(0);
    expect(releaseCalls).toBe(0);
  });

  test('preserves bootstrap and readiness evidence when readiness fails', async () => {
    await expect(
      executeApplicationRuntimeAcceptance(plan, {
        serviceName: 'roary-api',
        executeStepImpl,
        probeReadinessImpl: async () => ({
          ok: false,
          status: 'not-ready',
          detail: 'health probe rejected',
        }),
        execFile: async () => ({ exitCode: 0, stdout: SERVICE_JSON, stderr: '' }),
      }),
    ).rejects.toMatchObject({
      stage: 'readiness',
      failedStep: 'backend:run',
      bootstrap: expect.objectContaining({
        verified: true,
        started: ['backend:run'],
      }),
      readiness: [
        expect.objectContaining({
          step: 'backend:run',
          ok: false,
          status: 'not-ready',
        }),
      ],
    });
  });

  test('preserves completed bootstrap evidence when release inspection fails', async () => {
    await expect(
      executeApplicationRuntimeAcceptance(plan, {
        serviceName: 'roary-api',
        executeStepImpl,
        probeReadinessImpl: async () => ({ ok: true }),
        execFile: async () => ({
          exitCode: 1,
          stdout: 'partial',
          stderr: 'denied',
        }),
      }),
    ).rejects.toMatchObject({
      stage: 'release-evidence',
      bootstrap: expect.objectContaining({
        ready: true,
        started: ['backend:run'],
      }),
      releaseEvidence: expect.objectContaining({
        stage: 'revision-inspect',
        exitCode: 1,
        stdout: 'partial',
        stderr: 'denied',
      }),
    });
  });

  test('fails closed after JSON parsing when service traffic cannot prove the ready revision', async () => {
    const serviceWithoutTraffic = JSON.stringify({
      metadata: { name: 'roary-api' },
      status: {
        latestReadyRevisionName: 'roary-api-00042-abc',
        traffic: [],
      },
    });

    let failure;
    try {
      await executeApplicationRuntimeAcceptance(plan, {
        serviceName: 'roary-api',
        executeStepImpl,
        probeReadinessImpl: async () => ({ ok: true, status: 'ready' }),
        execFile: async () => ({
          exitCode: 0,
          stdout: serviceWithoutTraffic,
          stderr: 'shape-debug-evidence',
        }),
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({
      stage: 'release-evidence',
      releaseEvidence: expect.objectContaining({
        stage: 'revision-inspect',
        command: 'gcloud',
        exitCode: 0,
        stdout: serviceWithoutTraffic,
        stderr: 'shape-debug-evidence',
        args: expect.arrayContaining(['run', 'services', 'describe', 'roary-api']),
      }),
    });
    expect(failure).not.toHaveProperty('receipt');
    expect(failure).not.toHaveProperty('receiptFingerprint');
  });

  test('rejects parsed release evidence for a different service before emitting a receipt', async () => {
    const wrongService = JSON.stringify({
      metadata: { name: 'other-api' },
      status: {
        latestReadyRevisionName: 'other-api-00007-xyz',
        traffic: [{ revisionName: 'other-api-00007-xyz', percent: 100 }],
      },
    });

    await expect(
      executeApplicationRuntimeAcceptance(plan, {
        serviceName: 'roary-api',
        executeStepImpl,
        probeReadinessImpl: async () => ({ ok: true, status: 'ready' }),
        execFile: async () => ({ exitCode: 0, stdout: wrongService, stderr: '' }),
      }),
    ).rejects.toMatchObject({
      stage: 'release-evidence',
      message: expect.stringContaining(
        'release serviceName other-api does not match requested serviceName roary-api',
      ),
      releaseEvidence: expect.objectContaining({
        exitCode: 0,
        stdout: wrongService,
      }),
    });
  });
});
