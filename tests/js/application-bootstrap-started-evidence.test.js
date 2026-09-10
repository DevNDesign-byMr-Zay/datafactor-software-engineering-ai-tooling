import { describe, expect, test } from '@jest/globals';

import { executeApplicationBootstrapPlan } from '../../src/bootstrap/application-bootstrap-executor.js';
import { createApplicationBootstrapPlan } from '../../src/bootstrap/package-manifest.js';

const backendManifest = {
  name: 'ai-service',
  version: '0.2.0',
  type: 'module',
  scripts: { start: 'node index.mjs' },
};

const frontendManifest = {
  name: 'trainer-web',
  version: '0.0.1',
  private: true,
  type: 'module',
  scripts: { build: 'vite build' },
};

function productionPlan() {
  return createApplicationBootstrapPlan({ frontendManifest, backendManifest });
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
