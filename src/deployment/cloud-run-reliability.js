const DEFAULT_MAX_ATTEMPTS = 3;

function requireDeployPlan(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new TypeError('deployment plan must be an object');
  }
  if (plan.command !== 'gcloud') {
    throw new TypeError('deployment command must be gcloud');
  }
  if (!Array.isArray(plan.args) || plan.args[0] !== 'run' || plan.args[1] !== 'deploy') {
    throw new TypeError('deployment args must target gcloud run deploy');
  }
  return plan;
}

function requireAttemptCount(value) {
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    throw new TypeError('maxAttempts must be an integer between 1 and 10');
  }
  return value;
}

export function normalizeCloudRunExecutionResult(result = {}) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new TypeError('execution result must be an object');
  }

  const code = result.code ?? 0;
  if (!Number.isInteger(code)) {
    throw new TypeError('execution result code must be an integer');
  }

  return {
    code,
    stdout: typeof result.stdout === 'string' ? result.stdout : '',
    stderr: typeof result.stderr === 'string' ? result.stderr : '',
  };
}

export function isRetryableCloudRunFailure(error) {
  const code = error?.code;
  if (['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN'].includes(code)) return true;

  const text = `${error?.message ?? ''} ${error?.stderr ?? ''}`.toLowerCase();
  return [
    'deadline exceeded',
    'temporarily unavailable',
    'service unavailable',
    'connection reset',
    'rate limit',
    'too many requests',
  ].some((marker) => text.includes(marker));
}

function compactFailure(error) {
  return {
    name: error?.name ?? 'Error',
    code: error?.code ?? null,
    message: error?.message ?? String(error),
    stderr: typeof error?.stderr === 'string' ? error.stderr : '',
  };
}

/**
 * Execute Jameal's deterministic Cloud Run deployment plan with bounded retry
 * semantics and explicit per-attempt evidence. The same command/argument vector
 * is reused on every attempt so retries cannot silently mutate deployment intent.
 */
export async function executeCloudRunDeployWithRetry(
  plan,
  {
    execFileImpl,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    retryDelayImpl = async () => {},
    isRetryable = isRetryableCloudRunFailure,
  } = {},
) {
  const candidate = requireDeployPlan(plan);
  const attemptLimit = requireAttemptCount(maxAttempts);
  if (typeof execFileImpl !== 'function') {
    throw new TypeError('execFileImpl must be a function');
  }
  if (typeof retryDelayImpl !== 'function') {
    throw new TypeError('retryDelayImpl must be a function');
  }
  if (typeof isRetryable !== 'function') {
    throw new TypeError('isRetryable must be a function');
  }

  const command = candidate.command;
  const args = [...candidate.args];
  const attempts = [];

  for (let attempt = 1; attempt <= attemptLimit; attempt += 1) {
    try {
      const result = normalizeCloudRunExecutionResult(await execFileImpl(command, [...args]));
      attempts.push({ attempt, ok: true, result });
      return {
        command,
        args,
        attempts,
        attemptCount: attempt,
        retried: attempt > 1,
        result,
      };
    } catch (cause) {
      const retryable = Boolean(isRetryable(cause));
      attempts.push({
        attempt,
        ok: false,
        retryable,
        error: compactFailure(cause),
      });

      if (!retryable || attempt === attemptLimit) {
        const error = new Error(
          `Cloud Run deployment failed after ${attempt} attempt${attempt === 1 ? '' : 's'}: ${cause?.message ?? String(cause)}`,
          { cause },
        );
        error.stage = 'deploy';
        error.retryable = retryable;
        error.attempts = attempts;
        error.command = command;
        error.args = args;
        throw error;
      }

      await retryDelayImpl({
        attempt,
        nextAttempt: attempt + 1,
        error: cause,
      });
    }
  }

  throw new Error('unreachable Cloud Run retry state');
}
