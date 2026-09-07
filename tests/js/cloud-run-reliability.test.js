import { jest } from '@jest/globals';

import { createCloudRunDeploymentPlan } from '../../src/deployment/cloud-run.js';
import {
  executeCloudRunDeployWithRetry,
  isRetryableCloudRunFailure,
  normalizeCloudRunExecutionResult,
} from '../../src/deployment/cloud-run-reliability.js';

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

describe('Cloud Run reliability execution', () => {
  test('normalizes gcloud process results into one stable contract', () => {
    expect(normalizeCloudRunExecutionResult({ stdout: 'deployed' })).toEqual({
      code: 0,
      stdout: 'deployed',
      stderr: '',
    });
    expect(() => normalizeCloudRunExecutionResult({ code: '0' })).toThrow(
      'execution result code must be an integer',
    );
  });

  test('classifies only mechanically recognizable transient failures for retry', () => {
    expect(isRetryableCloudRunFailure({ code: 'ETIMEDOUT' })).toBe(true);
    expect(isRetryableCloudRunFailure({ message: '503 service unavailable' })).toBe(true);
    expect(isRetryableCloudRunFailure({ message: 'permission denied' })).toBe(false);
  });

  test('retries the exact Jameal deploy vector and returns per-attempt evidence', async () => {
    const calls = [];
    const delays = [];
    const result = await executeCloudRunDeployWithRetry(readyPlan(), {
      execFileImpl: async (command, args) => {
        calls.push({ command, args });
        if (calls.length === 1) {
          const error = new Error('temporarily unavailable');
          error.code = 'EAI_AGAIN';
          throw error;
        }
        return { code: 0, stdout: 'deployed', stderr: '' };
      },
      retryDelayImpl: async (metadata) => delays.push(metadata.attempt),
    });

    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual(calls[0]);
    expect(delays).toEqual([1]);
    expect(result).toMatchObject({
      attemptCount: 2,
      retried: true,
      result: { code: 0, stdout: 'deployed', stderr: '' },
    });
    expect(result.attempts).toEqual([
      expect.objectContaining({ attempt: 1, ok: false, retryable: true }),
      expect.objectContaining({ attempt: 2, ok: true }),
    ]);
  });

  test('treats resolved nonzero gcloud results as retryable failures when stderr is transient', async () => {
    const execFileImpl = jest
      .fn()
      .mockResolvedValueOnce({ code: 1, stderr: 'service unavailable' })
      .mockResolvedValueOnce({ code: 0, stdout: 'deployed' });

    const result = await executeCloudRunDeployWithRetry(readyPlan(), { execFileImpl });

    expect(execFileImpl).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      attemptCount: 2,
      retried: true,
      result: { code: 0, stdout: 'deployed', stderr: '' },
    });
    expect(result.attempts[0]).toMatchObject({
      attempt: 1,
      ok: false,
      retryable: true,
      error: {
        code: 1,
        message: 'gcloud exited with code 1',
        stderr: 'service unavailable',
      },
    });
  });

  test('does not retry permanent deployment failures', async () => {
    const execFileImpl = jest.fn(async () => {
      throw new Error('permission denied');
    });

    await expect(
      executeCloudRunDeployWithRetry(readyPlan(), { execFileImpl }),
    ).rejects.toMatchObject({
      stage: 'deploy',
      retryable: false,
      attempts: [expect.objectContaining({ attempt: 1, ok: false, retryable: false })],
    });
    expect(execFileImpl).toHaveBeenCalledTimes(1);
  });

  test('stops at the configured retry bound and preserves every failure', async () => {
    const execFileImpl = jest.fn(async () => {
      const error = new Error('deadline exceeded');
      error.code = 'ETIMEDOUT';
      throw error;
    });

    await expect(
      executeCloudRunDeployWithRetry(readyPlan(), {
        execFileImpl,
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
  });

  test('rejects malformed deployment plans and retry configuration before execution', async () => {
    const execFileImpl = jest.fn();
    await expect(
      executeCloudRunDeployWithRetry({ command: 'bash', args: [] }, { execFileImpl }),
    ).rejects.toThrow('deployment command must be gcloud');
    await expect(
      executeCloudRunDeployWithRetry(readyPlan(), {
        execFileImpl,
        maxAttempts: 0,
      }),
    ).rejects.toThrow('maxAttempts must be an integer between 1 and 10');
    expect(execFileImpl).not.toHaveBeenCalled();
  });
});
