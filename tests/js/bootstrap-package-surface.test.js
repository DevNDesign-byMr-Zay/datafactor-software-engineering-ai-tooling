import { readFile } from 'node:fs/promises';

import {
  createNodeBootstrapStepExecutor,
  executeApplicationBootstrapPlan,
  executeApplicationBootstrapWithReadiness,
} from '../../src/index.js';

const packageJson = JSON.parse(
  await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
);

describe('bootstrap package surface', () => {
  test('root entrypoint exposes executable bootstrap runtime helpers', () => {
    expect(executeApplicationBootstrapPlan).toEqual(expect.any(Function));
    expect(createNodeBootstrapStepExecutor).toEqual(expect.any(Function));
    expect(executeApplicationBootstrapWithReadiness).toEqual(expect.any(Function));
  });

  test('package exports expose bootstrap execution and readiness subpaths', () => {
    expect(packageJson.exports['./application-bootstrap']).toBe(
      './src/bootstrap/application-bootstrap-executor.js',
    );
    expect(packageJson.exports['./application-bootstrap-readiness']).toBe(
      './src/bootstrap/application-bootstrap-readiness.js',
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
});
