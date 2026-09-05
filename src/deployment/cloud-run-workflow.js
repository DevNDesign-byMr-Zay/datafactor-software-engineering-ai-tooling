import { executeCloudRunSmokePlan } from './cloud-run.js';

function requireDeploymentPlan(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new TypeError('deployment plan must be an object');
  }
  return plan;
}

export function assessCloudRunDeploymentReadiness(plan) {
  const candidate = requireDeploymentPlan(plan);
  const blockers = [];

  if (candidate.command !== 'gcloud') {
    blockers.push('deployment command must be gcloud');
  }
  if (!Array.isArray(candidate.args) || candidate.args.length === 0) {
    blockers.push('deployment args must be a non-empty array');
  } else if (candidate.args[0] !== 'run' || candidate.args[1] !== 'deploy') {
    blockers.push('deployment args must target gcloud run deploy');
  }
  if (candidate.environmentReport?.valid !== true) {
    blockers.push(...(candidate.environmentReport?.errors ?? ['environment is not deployment-ready']));
  }
  if (!Array.isArray(candidate.smoke) || candidate.smoke.length === 0) {
    blockers.push('smoke plan must be a non-empty array');
  }

  return { ready: blockers.length === 0, blockers };
}

function createDeploymentEvidence(candidate, execution, smoke) {
  return {
    command: candidate.command,
    args: [...candidate.args],
    environment: {
      valid: candidate.environmentReport?.valid === true,
      envFileSensitiveKeys: [...(candidate.envFileSensitiveKeys ?? [])],
    },
    process: {
      stdout: execution?.stdout ?? '',
      stderr: execution?.stderr ?? '',
    },
    smoke: smoke.map(({ method, url, status, ok }) => ({ method, url, status, ok })),
    verified: smoke.length > 0 && smoke.every(({ ok }) => ok === true),
  };
}

export async function executeCloudRunDeploymentWorkflow(
  plan,
  { execFileImpl, fetchImpl = globalThis.fetch } = {},
) {
  const candidate = requireDeploymentPlan(plan);
  if (typeof execFileImpl !== 'function') {
    throw new TypeError('execFileImpl must be a function');
  }

  const readiness = assessCloudRunDeploymentReadiness(candidate);
  if (!readiness.ready) {
    const error = new Error(`deployment plan is not ready: ${readiness.blockers.join('; ')}`);
    error.blockers = readiness.blockers;
    throw error;
  }

  let execution;
  try {
    execution = await execFileImpl(candidate.command, [...candidate.args]);
  } catch (cause) {
    const error = new Error(`Cloud Run deployment command failed: ${cause.message}`, { cause });
    error.stage = 'deploy';
    throw error;
  }

  let smoke;
  try {
    smoke = await executeCloudRunSmokePlan(candidate.smoke, { fetchImpl });
  } catch (cause) {
    const error = new Error(`Cloud Run post-deploy verification failed: ${cause.message}`, { cause });
    error.stage = 'smoke';
    error.deployment = {
      command: candidate.command,
      args: [...candidate.args],
      stdout: execution?.stdout ?? '',
      stderr: execution?.stderr ?? '',
    };
    error.smokeResults = cause.results ?? (cause.result ? [cause.result] : []);
    throw error;
  }

  return {
    deployment: {
      command: candidate.command,
      args: [...candidate.args],
      stdout: execution?.stdout ?? '',
      stderr: execution?.stderr ?? '',
    },
    smoke,
    evidence: createDeploymentEvidence(candidate, execution, smoke),
  };
}
