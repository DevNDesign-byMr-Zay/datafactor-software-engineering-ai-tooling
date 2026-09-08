import {
  createNodeBootstrapStepExecutor,
  executeApplicationBootstrapPlan,
} from '../../src/bootstrap/application-bootstrap-executor.js';
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

function productionPlan() {
  return createApplicationBootstrapPlan({ frontendManifest, backendManifest });
}

describe('application bootstrap execution', () => {
  test('executes the authenticated production startup order and preserves evidence', async () => {
    const calls = [];
    const result = await executeApplicationBootstrapPlan(productionPlan(), {
      executeStepImpl: async (step) => {
        calls.push(step.key);
        return step.phase === 'run'
          ? { state: 'started', pid: 4242, stdout: 'listening' }
          : { code: 0, stdout: `${step.key} complete` };
      },
    });

    expect(calls).toEqual([
      'frontend:install',
      'frontend:build',
      'backend:install',
      'backend:run',
    ]);
    expect(result).toMatchObject({
      verified: true,
      started: ['backend:run'],
      startupOrder: calls,
    });
    expect(result.evidence).toHaveLength(4);
    expect(result.evidence[3]).toMatchObject({
      step: 'backend:run',
      ok: true,
      result: { state: 'started', pid: 4242 },
    });
  });

  test('fails closed before execution when startup order omits a declared step', async () => {
    const plan = productionPlan();
    plan.startupOrder = plan.startupOrder.slice(0, -1);
    const executeStepImpl = jest.fn();

    await expect(executeApplicationBootstrapPlan(plan, { executeStepImpl })).rejects.toThrow(
      'startupOrder must include every bootstrap step exactly once',
    );
    expect(executeStepImpl).not.toHaveBeenCalled();
  });

  test('stops on the first failed phase and keeps prior execution evidence', async () => {
    const calls = [];
    await expect(
      executeApplicationBootstrapPlan(productionPlan(), {
        executeStepImpl: async (step) => {
          calls.push(step.key);
          if (step.key === 'backend:install') {
            return { code: 17, stdout: 'install output', stderr: 'dependency failure' };
          }
          return { code: 0, stdout: 'ok' };
        },
      }),
    ).rejects.toMatchObject({
      stage: 'bootstrap',
      failedStep: 'backend:install',
      evidence: [
        expect.objectContaining({ step: 'frontend:install', ok: true }),
        expect.objectContaining({ step: 'frontend:build', ok: true }),
        expect.objectContaining({
          step: 'backend:install',
          ok: false,
          error: expect.objectContaining({
            code: 17,
            stdout: 'install output',
            stderr: 'dependency failure',
          }),
        }),
      ],
    });
    expect(calls).toEqual(['frontend:install', 'frontend:build', 'backend:install']);
  });

  test('uses execFile for finite phases and startProcess for long-lived run phases', async () => {
    const execCalls = [];
    const startCalls = [];
    const executor = createNodeBootstrapStepExecutor({
      workingDirectories: { frontend: '/workspace/web', backend: '/workspace/api' },
      execFileImpl: async (command, args, options) => {
        execCalls.push({ command, args, options });
        return { code: 0, stdout: 'done' };
      },
      startProcessImpl: async (command, args, options) => {
        startCalls.push({ command, args, options });
        return { pid: 99, stdout: 'started' };
      },
    });

    const result = await executeApplicationBootstrapPlan(productionPlan(), {
      executeStepImpl: executor,
    });

    expect(execCalls).toHaveLength(3);
    expect(execCalls[0].options).toEqual({ cwd: '/workspace/web' });
    expect(execCalls[2].options).toEqual({ cwd: '/workspace/api' });
    expect(startCalls).toEqual([
      {
        command: 'npm',
        args: ['start'],
        options: { cwd: '/workspace/api' },
      },
    ]);
    expect(result.evidence[3].result).toMatchObject({ state: 'started', pid: 99 });
  });

  test('preserves development ordering while starting backend and frontend processes', async () => {
    const plan = createApplicationBootstrapPlan({
      frontendManifest,
      backendManifest,
      mode: 'development',
    });
    const calls = [];

    const result = await executeApplicationBootstrapPlan(plan, {
      executeStepImpl: async (step) => {
        calls.push(step.key);
        return step.phase === 'run' ? { state: 'started', pid: calls.length } : { code: 0 };
      },
    });

    expect(calls).toEqual([
      'frontend:install',
      'backend:install',
      'backend:run',
      'frontend:run',
    ]);
    expect(result.started).toEqual(['backend:run', 'frontend:run']);
  });

  test('requires explicit process adapters instead of silently executing shell commands', () => {
    expect(() => createNodeBootstrapStepExecutor()).toThrow('execFileImpl must be a function');
  });
});
