import test from 'node:test';
import assert from 'node:assert/strict';

import { createApplicationBootstrapPlan } from '../../src/bootstrap/application-bootstrap.js';
import { executeApplicationBootstrapWithReadiness } from '../../src/bootstrap/application-bootstrap-readiness.js';

function executorForStartedPids() {
  let pid = 4100;
  return async ({ step }) => {
    if (step.kind === 'run') return { status: 'started', pid: pid++ };
    return { ok: true, exitCode: 0 };
  };
}

test('production bootstrap verifies backend readiness after startup', async () => {
  const plan = createApplicationBootstrapPlan({ mode: 'production' });
  const probes = [];

  const result = await executeApplicationBootstrapWithReadiness(plan, {
    executeStepImpl: executorForStartedPids(),
    probeReadinessImpl: async (input) => {
      probes.push(input);
      return { ok: true, status: 'ready', detail: 'health boundary accepted' };
    },
  });

  assert.equal(result.ready, true);
  assert.equal(result.started.length, 1);
  assert.equal(result.readiness.length, 1);
  assert.equal(result.readiness[0].step, result.started[0].step);
  assert.equal(result.readiness[0].pid, result.started[0].pid);
  assert.equal(probes[0].mode, 'production');
});

test('development bootstrap probes started services in deterministic order', async () => {
  const plan = createApplicationBootstrapPlan({ mode: 'development' });
  const probedSteps = [];

  const result = await executeApplicationBootstrapWithReadiness(plan, {
    executeStepImpl: executorForStartedPids(),
    probeReadinessImpl: async ({ step }) => {
      probedSteps.push(step);
      return { ok: true };
    },
  });

  assert.deepEqual(
    probedSteps,
    result.started.map(({ step }) => step),
  );
  assert.deepEqual(
    result.readiness.map(({ step }) => step),
    probedSteps,
  );
});

test('failed readiness preserves completed bootstrap and probe evidence', async () => {
  const plan = createApplicationBootstrapPlan({ mode: 'production' });

  await assert.rejects(
    executeApplicationBootstrapWithReadiness(plan, {
      executeStepImpl: executorForStartedPids(),
      probeReadinessImpl: async () => ({
        ok: false,
        status: 'not-ready',
        detail: 'health probe rejected',
      }),
    }),
    (error) => {
      assert.equal(error.stage, 'readiness');
      assert.ok(error.failedStep);
      assert.equal(error.bootstrap.started.length, 1);
      assert.equal(error.readiness.length, 1);
      assert.equal(error.readiness[0].ok, false);
      return true;
    },
  );
});

test('invalid readiness probe result is rejected without fabricating readiness', async () => {
  const plan = createApplicationBootstrapPlan({ mode: 'production' });

  await assert.rejects(
    executeApplicationBootstrapWithReadiness(plan, {
      executeStepImpl: executorForStartedPids(),
      probeReadinessImpl: async () => ({ status: 'ready' }),
    }),
    (error) => {
      assert.equal(error.stage, 'readiness');
      assert.equal(error.readiness.length, 0);
      assert.match(error.cause.message, /boolean ok/);
      return true;
    },
  );
});
