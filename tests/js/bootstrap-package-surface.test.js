import { readFile } from 'node:fs/promises';

import {
  createNodeBootstrapStepExecutor,
  decideRuntimeAcceptanceChange,
  executeApplicationBootstrapPlan,
  executeApplicationBootstrapWithReadiness,
  executeApplicationRuntimeAcceptance,
  RUNTIME_ACCEPTANCE_DECISIONS,
} from '../../src/index.js';

const packageJson = JSON.parse(
  await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
);

describe('bootstrap package surface', () => {
  test('root entrypoint exposes executable bootstrap runtime helpers', () => {
    expect(executeApplicationBootstrapPlan).toEqual(expect.any(Function));
    expect(createNodeBootstrapStepExecutor).toEqual(expect.any(Function));
    expect(executeApplicationBootstrapWithReadiness).toEqual(expect.any(Function));
    expect(executeApplicationRuntimeAcceptance).toEqual(expect.any(Function));
  });

  test('root entrypoint exposes the pure runtime evidence decision contract', () => {
    expect(decideRuntimeAcceptanceChange).toEqual(expect.any(Function));
    expect(RUNTIME_ACCEPTANCE_DECISIONS).toEqual({
      REJECTED: 'rejected',
      UNCHANGED: 'unchanged',
      CHANGED: 'changed',
    });
  });

  test('package exports expose bootstrap, readiness, acceptance, and evidence subpaths', () => {
    expect(packageJson.exports['./application-bootstrap']).toBe(
      './src/bootstrap/application-bootstrap-executor.js',
    );
    expect(packageJson.exports['./application-bootstrap-readiness']).toBe(
      './src/bootstrap/application-bootstrap-readiness.js',
    );
    expect(packageJson.exports['./application-runtime-acceptance']).toBe(
      './src/runtime/application-runtime-acceptance.js',
    );
    expect(packageJson.exports['./runtime-acceptance-receipt']).toBe(
      './src/runtime/runtime-acceptance-receipt.js',
    );
    expect(packageJson.exports['./runtime-acceptance-decision']).toBe(
      './src/runtime/runtime-acceptance-decision.js',
    );
  });

  test('Node resolves the application bootstrap subpath through the package export map', async () => {
    const bootstrap = await import(`${packageJson.name}/application-bootstrap`);

    expect(bootstrap.executeApplicationBootstrapPlan).toBe(executeApplicationBootstrapPlan);
    expect(bootstrap.createNodeBootstrapStepExecutor).toBe(createNodeBootstrapStepExecutor);
  });

  test('Node resolves the readiness subpath through the package export map', async () => {
    const readiness = await import(`${packageJson.name}/application-bootstrap-readiness`);

    expect(readiness.executeApplicationBootstrapWithReadiness).toBe(
      executeApplicationBootstrapWithReadiness,
    );
  });

  test('Node resolves the runtime acceptance subpath through the package export map', async () => {
    const acceptance = await import(`${packageJson.name}/application-runtime-acceptance`);

    expect(acceptance.executeApplicationRuntimeAcceptance).toBe(
      executeApplicationRuntimeAcceptance,
    );
  });

  test('Node resolves the evidence decision subpath through the package export map', async () => {
    const decision = await import(`${packageJson.name}/runtime-acceptance-decision`);

    expect(decision.decideRuntimeAcceptanceChange).toBe(decideRuntimeAcceptanceChange);
    expect(decision.RUNTIME_ACCEPTANCE_DECISIONS).toBe(RUNTIME_ACCEPTANCE_DECISIONS);
  });
});
