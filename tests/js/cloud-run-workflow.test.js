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

function jsonResponse(body) {
  return { status: 200, ok: true, json: async () => body };
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

  test('executes gcloud before the authenticated smoke sequence and preserves evidence', async () => {
    const events = [];
    const plan = readyPlan();
    const execFileImpl = async (command, args) => {
      events.push({ type: 'deploy', command, args });
      return { stdout: 'deployed', stderr: '' };
    };
    const fetchImpl = async (url, options) => {
      events.push({ type: 'smoke', url, method: options.method });
      return jsonResponse({ ok: true });
    };

    const result = await executeCloudRunDeploymentWorkflow(plan, { execFileImpl, fetchImpl });

    expect(events.map(({ type }) => type)).toEqual(['deploy', 'smoke', 'smoke']);
    expect(events[0]).toMatchObject({
      command: 'gcloud',
      args: expect.arrayContaining(['run', 'deploy', 'service']),
    });
    expect(result.deployment).toMatchObject({
      command: 'gcloud',
      stdout: 'deployed',
      stderr: '',
    });
    expect(result.smoke).toHaveLength(2);
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

  test('stops before smoke verification when gcloud execution fails', async () => {
    const fetchImpl = jest.fn();

    await expect(
      executeCloudRunDeploymentWorkflow(readyPlan(), {
        execFileImpl: async () => {
          throw new Error('permission denied');
        },
        fetchImpl,
      }),
    ).rejects.toThrow('Cloud Run deployment command failed: permission denied');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('rejects malformed plans and process adapters explicitly', async () => {
    expect(() => assessCloudRunDeploymentReadiness(null)).toThrow('deployment plan must be an object');
    await expect(executeCloudRunDeploymentWorkflow(readyPlan())).rejects.toThrow(
      'execFileImpl must be a function',
    );
  });
});
