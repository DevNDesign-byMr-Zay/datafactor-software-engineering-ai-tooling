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
  test('joins bootstrap readiness with mechanically returned Cloud Run release evidence', async () => {
    const execFile = async (command, args) => {
      expect(command).toBe('gcloud');
      expect(args).toContain('roary-api');
      return { exitCode: 0, stdout: SERVICE_JSON, stderr: '' };
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
      service: {
        serviceName: 'roary-api',
        latestReadyRevisionName: 'roary-api-00042-abc',
      },
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
});
