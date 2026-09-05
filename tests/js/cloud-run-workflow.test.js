import { createCloudRunDeploymentPlan } from '../../src/deployment/cloud-run.js';
import {
  assessCloudRunDeploymentReadiness,
  executeCloudRunDeploymentWorkflow,
} from '../../src/deployment/cloud-run-workflow.js';

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

describe('Cloud Run deployment workflow', () => {
  test('accepts Jameal planner output only when deployment and smoke gates are ready', () => {
    expect(assessCloudRunDeploymentReadiness(readyPlan())).toEqual({ ready: true, blockers: [] });

    const blocked = readyPlan();
    blocked.environmentReport = {
      valid: false,
      errors: ['unresolved placeholder environment value: APP_API_TOKEN'],
    };

    expect(assessCloudRunDeploymentReadiness(blocked)).toEqual({
      ready: false,
      blockers: ['unresolved placeholder environment value: APP_API_TOKEN'],
    });
  });

  test('executes deployment before smoke verification and returns compact evidence', async () => {
    const events = [];
    const result = await executeCloudRunDeploymentWorkflow(readyPlan(), {
      execFileImpl: async (command, args) => {
        events.push({ type: 'deploy', command, args });
        return { stdout: 'deployed', stderr: '' };
      },
      fetchImpl: async (url, options) => {
        events.push({ type: 'smoke', url, method: options.method });
        return jsonResponse({ ok: true });
      },
    });

    expect(events.map(({ type }) => type)).toEqual(['deploy', 'smoke', 'smoke']);
    expect(result.evidence).toMatchObject({
      command: 'gcloud',
      verified: true,
      environment: {
        valid: true,
        envFileSensitiveKeys: ['ALLOWED_ORIGINS'],
      },
      process: { stdout: 'deployed', stderr: '' },
    });
    expect(result.evidence.smoke).toEqual([
      expect.objectContaining({ method: 'GET', status: 200, ok: true }),
      expect.objectContaining({ method: 'POST', status: 200, ok: true }),
    ]);
  });

  test('refuses unresolved environment configuration before process execution', async () => {
    const plan = readyPlan();
    plan.environmentReport = {
      valid: false,
      errors: ['missing required environment value: GEMINI_API_KEY'],
    };
    const execFileImpl = jest.fn();

    await expect(executeCloudRunDeploymentWorkflow(plan, { execFileImpl })).rejects.toMatchObject({
      message: expect.stringContaining('deployment plan is not ready'),
      blockers: ['missing required environment value: GEMINI_API_KEY'],
    });
    expect(execFileImpl).not.toHaveBeenCalled();
  });

  test('labels deployment process failures and stops before smoke verification', async () => {
    const fetchImpl = jest.fn();

    await expect(
      executeCloudRunDeploymentWorkflow(readyPlan(), {
        execFileImpl: async () => {
          throw new Error('permission denied');
        },
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      message: 'Cloud Run deployment command failed: permission denied',
      stage: 'deploy',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test(
    'preserves deployment and partial smoke evidence when post-deploy verification fails',
    async () => {
      let requestCount = 0;

      await expect(
        executeCloudRunDeploymentWorkflow(readyPlan(), {
          execFileImpl: async () => ({ stdout: 'deployed', stderr: 'warning' }),
          fetchImpl: async () => {
            requestCount += 1;
            return requestCount === 1
              ? jsonResponse({ ok: true })
              : jsonResponse({ error: 'bad gateway' }, 502);
          },
        }),
      ).rejects.toMatchObject({
        stage: 'smoke',
        deployment: expect.objectContaining({ stdout: 'deployed', stderr: 'warning' }),
        smokeResults: [
          expect.objectContaining({ method: 'GET', status: 200, ok: true }),
          expect.objectContaining({ method: 'POST', status: 502, ok: false }),
        ],
      });
    },
  );

  test('rejects malformed plans and missing process adapters explicitly', async () => {
    expect(() => assessCloudRunDeploymentReadiness(null)).toThrow(
      'deployment plan must be an object',
    );
    await expect(executeCloudRunDeploymentWorkflow(readyPlan())).rejects.toThrow(
      'execFileImpl must be a function',
    );
  });
});
