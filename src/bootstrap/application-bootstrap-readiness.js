import { executeApplicationBootstrapPlan } from './application-bootstrap-executor.js';

/**
 * Execute an application bootstrap plan and verify that every started service
 * reaches its declared runtime readiness boundary.
 *
 * Readiness is derived from the executor's authenticated evidence contract
 * rather than inventing a second representation for started processes.
 */
export async function executeApplicationBootstrapWithReadiness(plan, options = {}) {
  const probeReadinessImpl = options.probeReadinessImpl;
  if (typeof probeReadinessImpl !== 'function') {
    throw new TypeError('probeReadinessImpl must be a function');
  }

  const bootstrap = await executeApplicationBootstrapPlan(plan, options);
  const readiness = [];
  const startedEvidence = bootstrap.evidence.filter(
    ({ result }) => result?.state === 'started',
  );

  for (const started of startedEvidence) {
    let result;
    try {
      result = await probeReadinessImpl({
        step: started.step,
        pid: started.result.pid,
        stdout: started.result.stdout,
        stderr: started.result.stderr,
        mode: plan.mode,
        plan,
      });
    } catch (cause) {
      throw readinessError(started.step, bootstrap, readiness, cause);
    }

    if (!result || typeof result.ok !== 'boolean') {
      throw readinessError(
        started.step,
        bootstrap,
        readiness,
        new TypeError('readiness probe must return an object with boolean ok'),
      );
    }

    const evidence = {
      stage: 'readiness',
      step: started.step,
      pid: started.result.pid,
      ok: result.ok,
      ...(typeof result.status === 'string' ? { status: result.status } : {}),
      ...(typeof result.detail === 'string' ? { detail: result.detail } : {}),
    };
    readiness.push(evidence);

    if (!result.ok) {
      throw readinessError(
        started.step,
        bootstrap,
        readiness,
        new Error(result.detail || `readiness probe failed for ${started.step}`),
      );
    }
  }

  return {
    ...bootstrap,
    readiness,
    ready: true,
  };
}

function readinessError(failedStep, bootstrap, readiness, cause) {
  const error = new Error(
    `application bootstrap readiness failed at ${failedStep}: ${cause.message}`,
    { cause },
  );
  error.stage = 'readiness';
  error.failedStep = failedStep;
  error.bootstrap = bootstrap;
  error.readiness = [...readiness];
  return error;
}
