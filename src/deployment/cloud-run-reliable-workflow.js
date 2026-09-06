import { executeCloudRunSmokePlan } from './cloud-run.js';
import { executeCloudRunDeployWithRetry } from './cloud-run-reliability.js';

function requireReadyPlan(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new TypeError('deployment plan must be an object');
  }
  if (plan.environmentReport?.valid !== true) {
    const blockers = plan.environmentReport?.errors ?? ['environment is not deployment-ready'];
    const error = new Error(`deployment plan is not ready: ${blockers.join('; ')}`);
    error.stage = 'readiness';
    error.blockers = [...blockers];
    throw error;
  }
  if (!Array.isArray(plan.smoke) || plan.smoke.length === 0) {
    throw new TypeError('deployment smoke plan must be a non-empty array');
  }
  return plan;
}

function compactSmokeResults(results) {
  return results.map(({ method, url, status, ok }) => ({ method, url, status, ok }));
}

/**
 * Execute Jameal's authenticated Cloud Run deploy/smoke contract with bounded
 * retry semantics and one evidence record spanning readiness, deployment, and
 * post-deploy verification. Historical corpus artifacts remain untouched.
 */
export async function executeReliableCloudRunWorkflow(
  plan,
  { execFileImpl, fetchImpl = globalThis.fetch, maxAttempts, retryDelayImpl, isRetryable } = {},
) {
  const candidate = requireReadyPlan(plan);
  const retryOptions = { execFileImpl };
  if (maxAttempts !== undefined) retryOptions.maxAttempts = maxAttempts;
  if (retryDelayImpl !== undefined) retryOptions.retryDelayImpl = retryDelayImpl;
  if (isRetryable !== undefined) retryOptions.isRetryable = isRetryable;

  const deployment = await executeCloudRunDeployWithRetry(candidate, retryOptions);

  let smoke;
  try {
    smoke = await executeCloudRunSmokePlan(candidate.smoke, { fetchImpl });
  } catch (cause) {
    const smokeResults = cause.results ?? (cause.result ? [cause.result] : []);
    const error = new Error(`Cloud Run verification failed after deployment: ${cause.message}`, {
      cause,
    });
    error.stage = 'smoke';
    error.deployment = deployment;
    error.smokeResults = compactSmokeResults(smokeResults);
    throw error;
  }

  return {
    deployment,
    smoke,
    evidence: {
      ready: true,
      deployment: {
        command: deployment.command,
        args: [...deployment.args],
        attemptCount: deployment.attemptCount,
        retried: deployment.retried,
        attempts: deployment.attempts,
        result: deployment.result,
      },
      smoke: compactSmokeResults(smoke),
      verified: smoke.length > 0 && smoke.every(({ ok }) => ok === true),
    },
  };
}
