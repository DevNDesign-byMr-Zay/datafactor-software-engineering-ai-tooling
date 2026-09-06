import { jest } from '@jest/globals';

import { createCloudRunDeploymentPlan } from '../../src/deployment/cloud-run.js';
import { executeReliableCloudRunWorkflow } from '../../src/deployment/cloud-run-reliable-workflow.js';

const readyEnvironment = {
  BUCKET_NAME: 'production-bucket',
  ALLOWED_ORIGINS: 'https://app.example.com,https://admin.example.com',
  APP_API_TOKEN: 'secure-app-token',
  GEMINI_API_KEY: 'secure-provider-key',
};

function readyPlan() {
  return createCloudRunDeploymentPlan({
    serviceName: 'service',
    serviceUrl: 'https://service.example.run.app',
    token: 'token',
    environment: readyEnvironment,
  });
}

function jsonResponse(body, status = 200) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

describe('reliable Cloud Run deployment workflow', () => {
  test('blocks invalid environment readiness before deployment or smoke transport', async () => {
    const plan = readyPlan();
    plan.environmentReport = {
      valid: false,
      errors: ['missing required environment value: GEMINI_API_KEY'],
    };
    const execFileImpl = jest.fn();
    const fetchImpl = jest.fn();

    await expect(
      executeReliableCloudRunWorkflow(plan, { execFileImpl, fetchImpl }),
    ).rejects.toMatchObject({
      stage: 'readiness',
      blockers: ['missing required environment value: GEMINI_API_KEY'],
    });
    expect(execFileImpl).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('carries retry attempts into successful post-deploy smoke evidence', async () => {
    let deployCalls = 0;
    const result = await executeReliableCloudRunWorkflow(readyPlan(), {
      execFileImpl: async () => {
        deployCalls += 1;
        if (deployCalls === 1) {
          const error = new Error('service unavailable');
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return { code: 0, stdout: 'deployed', stderr: '' };
      },
      fetchImpl: async () => jsonResponse({ ok: true }),
    });

    expect(result.evidence).toMatchObject({
      ready: true,
      verified: true,
      deployment: {
        attemptCount: 2,
        retried: true,
        result: { code: 0, stdout: 'deployed', stderr: '' },
      },
    });
    expect(result.evidence.deployment.attempts).toHaveLength(2);
    expect(result.evidence.smoke).toEqual([
      expect.objectContaining({ method: 'GET', status: 200, ok: true }),
      expect.objectContaining({ method: 'POST', status: 200, ok: true }),
    ]);
  });

  test('preserves deployment attempts and partial smoke evidence when verification fails', async () => {
    let requestCount = 0;

    await expect(
      executeReliableCloudRunWorkflow(readyPlan(), {
        execFileImpl: async () => ({ code: 0, stdout: 'deployed', stderr: '' }),
        fetchImpl: async () => {
          requestCount += 1;
          return requestCount === 1
            ? jsonResponse({ ok: true })
            : jsonResponse({ error: 'bad gateway' }, 502);
        },
      }),
    ).rejects.toMatchObject({
      stage: 'smoke',
      deployment: expect.objectContaining({ attemptCount: 1, retried: false }),
      smokeResults: [
        expect.objectContaining({ method: 'GET', status: 200, ok: true }),
        expect.objectContaining({ method: 'POST', status: 502, ok: false }),
      ],
    });
  });

  test('never starts smoke verification when retry-safe deployment is exhausted', async () => {
    const fetchImpl = jest.fn();
    const execFileImpl = jest.fn(async () => {
      const error = new Error('deadline exceeded');
      error.code = 'ETIMEDOUT';
      throw error;
    });

    await expect(
      executeReliableCloudRunWorkflow(readyPlan(), {
        execFileImpl,
        fetchImpl,
        maxAttempts: 2,
      }),
    ).rejects.toMatchObject({
      stage: 'deploy',
      retryable: true,
      attempts: [
        expect.objectContaining({ attempt: 1, retryable: true }),
        expect.objectContaining({ attempt: 2, retryable: true }),
      ],
    });
    expect(execFileImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
