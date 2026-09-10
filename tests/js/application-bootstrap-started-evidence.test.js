import { describe, expect, test } from '@jest/globals';

import { executeApplicationBootstrapPlan } from '../../src/bootstrap/application-bootstrap-executor.js';

function productionPlan() {
  return {
    mode: 'production',
    startupOrder: ['frontend:install', 'frontend:build', 'backend:install', 'backend:run'],
    frontend: {
      role: 'frontend',
      packageName: 'trainer-web',
      steps: [
        { phase: 'install', command: 'npm', args: ['ci'] },
        { phase: 'build', command: 'npm', args: ['run', 'build'], script: 'build' },
      ],
    },
    backend: {
      role: 'backend',
      packageName: 'ai-service',
      steps: [
        { phase: 'install', command: 'npm', args: ['ci'] },
        { phase: 'run', command: 'npm', args: ['run', 'start'], script: 'start' },
      ],
    },
  };
}

describe('started process evidence', () => {
  test.each([undefined, 0, -1])('rejects started process evidence with pid %s', async (pid) => {
    await expect(
      executeApplicationBootstrapPlan(productionPlan(), {
        executeStepImpl: async (step) =>
          step.phase === 'run'
            ? { state: 'started', pid, stdout: 'listener claimed' }
            : { code: 0, stdout: 'ok' },
      }),
    ).rejects.toMatchObject({
      stage: 'bootstrap',
      failedStep: 'backend:run',
      evidence: expect.arrayContaining([
        expect.objectContaining({
          step: 'backend:run',
          ok: false,
          error: expect.objectContaining({
            message: 'started bootstrap execution result pid must be a positive integer',
          }),
        }),
      ]),
    });
  });
});
