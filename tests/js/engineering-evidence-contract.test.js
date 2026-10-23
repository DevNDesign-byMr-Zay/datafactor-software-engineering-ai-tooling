import {
  collectEngineeringEvidence,
  buildEngineeringEvidence,
} from '../../scripts/build-engineering-evidence.mjs';

describe('maintained engineering evidence contract', () => {
  test('derives classification, real CI commands and exact Python pins from current sources', async () => {
    const data = await collectEngineeringEvidence({ sha: 'a'.repeat(40) });
    expect(data.commit).toBe('a'.repeat(40));
    expect(data.package.primaryClass).toBe('developer-tooling-library');
    expect(data.package.entrypoint).toBe('./src/index.js');
    expect(data.python.exactPinnedDistributionCount).toBeGreaterThan(35);
    expect(data.python.declaredDirectRequirements).toEqual(
      expect.arrayContaining(['fastapi', 'pillow', 'pytest', 'pip-audit']),
    );
    expect(data.verification.gates.javascript.tests).toBe('npm test');
    expect(data.verification.gates.python.dependencyAudit).toBe(
      'pip-audit -r requirements.lock.txt',
    );
    expect(data.executionProof).toMatch(/does not assert tests passed/u);
  });

  test('fails closed if an executable check is removed', async () => {
    const data = await collectEngineeringEvidence();
    expect(data.verification.gates.javascript.typecheck).toBe('npm run typecheck');
    const sample = {
      pkg: { main: './src/index.js', exports: { '.': './src/index.js' } },
      classification: { primaryClass: 'developer-tooling-library', maintainedSurfaces: ['src'] },
      workflow:
        'jobs:\n  javascript:\n  python:\n  fresh-clone-smoke:\n  container:\n  pull_request:',
      pythonLock: 'fastapi==1.0.0\n',
      pythonDeclared: 'fastapi>=0.1,<2',
      pythonDevDeclared: '',
    };
    expect(() => buildEngineeringEvidence(sample)).toThrow(/CI missing/u);
    expect(() => buildEngineeringEvidence({ ...sample, pythonLock: 'pytest==9.1.1\n' })).toThrow(
      /missing Python lock pin: fastapi/u,
    );
  });
});
