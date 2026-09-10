function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function requireFunction(value, name) {
  if (typeof value !== 'function') {
    throw new TypeError(`${name} must be a function`);
  }
  return value;
}

function normalizeExecutionResult(result = {}) {
  requireObject(result, 'bootstrap execution result');
  const code = result.code ?? 0;
  if (!Number.isInteger(code)) {
    throw new TypeError('bootstrap execution result code must be an integer');
  }
  const state = result.state ?? 'completed';
  if (!['completed', 'started'].includes(state)) {
    throw new TypeError('bootstrap execution result state must be completed or started');
  }
  const pid = Number.isInteger(result.pid) ? result.pid : null;
  if (state === 'started' && (pid === null || pid <= 0)) {
    throw new TypeError('started bootstrap execution result pid must be a positive integer');
  }
  return {
    code,
    state,
    pid,
    stdout: typeof result.stdout === 'string' ? result.stdout : '',
    stderr: typeof result.stderr === 'string' ? result.stderr : '',
  };
}

function compactFailure(error) {
  return {
    name: error?.name ?? 'Error',
    code: Number.isInteger(error?.code) ? error.code : null,
    message: error?.message ?? String(error),
    stdout: typeof error?.stdout === 'string' ? error.stdout : '',
    stderr: typeof error?.stderr === 'string' ? error.stderr : '',
  };
}

function indexBootstrapSteps(plan) {
  const candidate = requireObject(plan, 'application bootstrap plan');
  if (!['production', 'development'].includes(candidate.mode)) {
    throw new TypeError('application bootstrap mode must be production or development');
  }
  if (!Array.isArray(candidate.startupOrder) || candidate.startupOrder.length === 0) {
    throw new TypeError('application bootstrap startupOrder must be a non-empty array');
  }

  const stepIndex = new Map();
  for (const role of ['frontend', 'backend']) {
    const packagePlan = requireObject(candidate[role], `${role} bootstrap plan`);
    if (packagePlan.role !== role) {
      throw new Error(`${role} bootstrap plan role drifted to ${packagePlan.role ?? 'unknown'}`);
    }
    if (!Array.isArray(packagePlan.steps) || packagePlan.steps.length === 0) {
      throw new TypeError(`${role} bootstrap steps must be a non-empty array`);
    }
    for (const step of packagePlan.steps) {
      requireObject(step, `${role} bootstrap step`);
      if (typeof step.phase !== 'string' || !step.phase) {
        throw new TypeError(`${role} bootstrap step phase must be a non-empty string`);
      }
      if (typeof step.command !== 'string' || !step.command) {
        throw new TypeError(`${role} bootstrap step command must be a non-empty string`);
      }
      if (!Array.isArray(step.args)) {
        throw new TypeError(`${role} bootstrap step args must be an array`);
      }
      const key = `${role}:${step.phase}`;
      if (stepIndex.has(key)) throw new Error(`duplicate bootstrap step: ${key}`);
      stepIndex.set(key, {
        key,
        role,
        packageName: packagePlan.packageName ?? null,
        mode: candidate.mode,
        phase: step.phase,
        command: step.command,
        args: [...step.args],
        script: typeof step.script === 'string' ? step.script : null,
      });
    }
  }

  const expected = [...stepIndex.keys()].sort();
  const ordered = candidate.startupOrder.map((key) => {
    if (typeof key !== 'string' || !stepIndex.has(key)) {
      throw new Error(`startupOrder references unknown bootstrap step: ${String(key)}`);
    }
    return stepIndex.get(key);
  });
  const actual = [...new Set(candidate.startupOrder)].sort();
  if (
    actual.length !== candidate.startupOrder.length ||
    actual.join('\n') !== expected.join('\n')
  ) {
    throw new Error('startupOrder must include every bootstrap step exactly once');
  }

  return ordered;
}

function requireSuccessfulResult(step, result) {
  if (result.code === 0) return result;
  const error = new Error(`${step.key} exited with code ${result.code}`);
  error.code = result.code;
  error.stdout = result.stdout;
  error.stderr = result.stderr;
  throw error;
}

export async function executeApplicationBootstrapPlan(plan, { executeStepImpl } = {}) {
  const executeStep = requireFunction(executeStepImpl, 'executeStepImpl');
  const steps = indexBootstrapSteps(plan);
  const evidence = [];

  for (const step of steps) {
    try {
      const result = requireSuccessfulResult(
        step,
        normalizeExecutionResult(await executeStep({ ...step, args: [...step.args] })),
      );
      evidence.push({ step: step.key, ok: true, result });
    } catch (cause) {
      const failed = { step: step.key, ok: false, error: compactFailure(cause) };
      const error = new Error(
        `application bootstrap failed at ${step.key}: ${cause?.message ?? cause}`,
        { cause },
      );
      error.stage = 'bootstrap';
      error.failedStep = step.key;
      error.evidence = [...evidence, failed];
      throw error;
    }
  }

  return {
    mode: plan.mode,
    startupOrder: steps.map((step) => step.key),
    evidence,
    started: evidence.filter(({ result }) => result.state === 'started').map(({ step }) => step),
    verified: evidence.length === steps.length && evidence.every(({ ok }) => ok),
  };
}

export function createNodeBootstrapStepExecutor({
  execFileImpl,
  startProcessImpl,
  workingDirectories = {},
} = {}) {
  const execFile = requireFunction(execFileImpl, 'execFileImpl');
  const startProcess = requireFunction(startProcessImpl, 'startProcessImpl');
  requireObject(workingDirectories, 'workingDirectories');

  return async (step) => {
    const candidate = requireObject(step, 'bootstrap step');
    const cwd = workingDirectories[candidate.role];
    const options = cwd ? { cwd } : {};

    if (candidate.phase === 'run') {
      const started = await startProcess(candidate.command, [...candidate.args], options);
      return normalizeExecutionResult({ ...started, code: started?.code ?? 0, state: 'started' });
    }

    return normalizeExecutionResult(
      await execFile(candidate.command, [...candidate.args], options),
    );
  };
}
