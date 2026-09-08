import { executeApplicationBootstrapWithReadiness } from '../../src/bootstrap/application-bootstrap-readiness.js';
import { createApplicationBootstrapPlan } from '../../src/bootstrap/package-manifest.js';

const backendManifest = {
  name: 'ai-service',
  version: '0.2.0',
  type: 'module',
  scripts: { start: 'node index.mjs', dev: 'NODE_ENV=development node index.mjs' },
  engines: { node: '>=18' },
};

const frontendManifest = {
  name: 'trainer-web',
  version: '0.0.1',
  private: true,
  type: 'module',
  scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
};

function plan(mode = 'production') {
  return createApplicationBootstrapPlan({ frontendManifest, backendManifest, mode });
}

function executorForStartedPids() {
  let pid = 4100;
  return async (step) =>
    step.phase === 'run' ? { state: 'started', pid: pid++ } : { code: 0 };
}

describe('application bootstrap readiness handoff', () => {
  test('production bootstrap verifies backend readiness after startup', async () => {
    const probes = [];
    const result = await executeApplicationBootstrapWithReadiness(plan(), {
      executeStepImpl: executorForStartedPids(),
      probeReadinessImpl: async (input) => {
        probes.push(input);
        return { ok: true, status: 'ready', detail: 'health boundary accepted' };
      },
    });

    expect(result).toMatchObject({ ready: true, started: ['backend:run'] });
    expect(result.readiness).toEqual([
      expect.objectContaining({
        stage: 'readiness',
        step: 'backend:run',
        pid: 4100,
        ok: true,
        status: 'ready',
      }),
    ]);
    expect(probes[0]).toMatchObject({ step: 'backend:run', pid: 4100, mode: 'production' });
  });

  test('development bootstrap probes started services in deterministic order', async () => {
    const probedSteps = [];
    const result = await executeApplicationBootstrapWithReadiness(plan('development'), {
      executeStepImpl: executorForStartedPids(),
      probeReadinessImpl: async ({ step }) => {
        probedSteps.push(step);
        return { ok: true };
      },
    });

    expect(probedSteps).toEqual(['backend:run', 'frontend:run']);
    expect(result.started).toEqual(probedSteps);
    expect(result.readiness.map(({ step }) => step)).toEqual(probedSteps);
  });

  test('failed readiness preserves completed bootstrap and probe evidence', async () => {
    await expect(
      executeApplicationBootstrapWithReadiness(plan(), {
        executeStepImpl: executorForStartedPids(),
        probeReadinessImpl: async () => ({
          ok: false,
          status: 'not-ready',
          detail: 'health probe rejected',
        }),
      }),
    ).rejects.toMatchObject({
      stage: 'readiness',
      failedStep: 'backend:run',
      bootstrap: expect.objectContaining({ verified: true, started: ['backend:run'] }),
      readiness: [expect.objectContaining({ step: 'backend:run', ok: false })],
    });
  });

  test('invalid readiness probe result is rejected without fabricating readiness', async () => {
    await expect(
      executeApplicationBootstrapWithReadiness(plan(), {
        executeStepImpl: executorForStartedPids(),
        probeReadinessImpl: async () => ({ status: 'ready' }),
      }),
    ).rejects.toMatchObject({
      stage: 'readiness',
      failedStep: 'backend:run',
      readiness: [],
      cause: expect.objectContaining({ message: expect.stringMatching(/boolean ok/) }),
    });
  });
});
