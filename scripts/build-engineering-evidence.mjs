import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

function requireContract(ok, message) {
  if (!ok) throw new Error(`Engineering evidence contract: ${message}`);
}

export function buildEngineeringEvidence({
  pkg,
  classification,
  workflow,
  pythonLock,
  pythonConventionalLock = null,
  pythonDeclared,
  pythonDevDeclared,
  sha = null,
}) {
  requireContract(pkg.main === './src/index.js', 'canonical public package entrypoint is missing');
  requireContract(pkg.exports?.['.'] === pkg.main, 'root export and main differ');
  requireContract(
    classification.primaryClass === 'developer-tooling-library',
    'maintained package classification changed',
  );
  requireContract(
    Array.isArray(classification.maintainedSurfaces),
    'maintained roots must be declared',
  );
  const jsRuntimeDependencies = Object.keys(pkg.dependencies ?? {}).sort();
  const lockedPython = new Map();
  for (const entry of pythonLock.split(/\r?\n/u)) {
    if (!entry.trim() || entry.startsWith('#')) continue;
    const match = /^([A-Za-z0-9_.-]+)==([A-Za-z0-9_.+-]+)$/u.exec(entry.trim());
    requireContract(match, 'Python lock entries must have exact version pins');
    const name = match[1].toLowerCase().replace(/_/gu, '-');
    requireContract(!lockedPython.has(name), 'duplicate Python dependency ' + name);
    lockedPython.set(name, match[2]);
  }
  requireContract(lockedPython.size > 0, 'Python lockfile must not be empty');
  if (pythonConventionalLock !== null) {
    const conventional = new Map();
    for (const line of pythonConventionalLock.split(/\r?\n/u)) {
      const entry = line.trim();
      if (!entry || entry.startsWith('#')) continue;
      const match = /^([A-Za-z0-9_.-]+)==([A-Za-z0-9_.+-]+)$/u.exec(entry);
      requireContract(match, 'requirements.txt must contain only exact distribution pins');
      const name = match[1].toLowerCase().replace(/_/gu, '-');
      requireContract(!conventional.has(name), 'duplicate conventional Python dependency ' + name);
      conventional.set(name, match[2]);
    }
    requireContract(
      conventional.size === lockedPython.size &&
        [...lockedPython].every(([name, version]) => conventional.get(name) === version),
      'conventional requirements.txt and requirements.lock.txt must match exactly',
    );
  }
  const declared = [pythonDeclared, pythonDevDeclared]
    .flatMap((value) => value.split(/\r?\n/u))
    .map((value) => value.trim())
    .filter((value) => value && !value.startsWith('#') && !value.startsWith('-r '))
    .map((value) =>
      value
        .match(/^([A-Za-z0-9_.-]+)/u)?.[1]
        ?.toLowerCase()
        .replace(/_/gu, '-'),
    );
  for (const name of declared)
    requireContract(lockedPython.has(name), 'missing Python lock pin: ' + name);
  const gates = {
    javascript: [
      ['lint', 'npm run lint'],
      ['typecheck', 'npm run typecheck'],
      ['strictTypecheck', 'npm run typecheck:strict'],
      ['tests', 'npm test'],
      ['coverage', 'npm run test:coverage'],
      ['format', 'npm run format:check'],
      ['dependencyAudit', 'npm audit --audit-level=moderate'],
    ],
    python: [
      ['tests', 'python -m pytest'],
      ['coverage', 'python -m coverage report'],
      ['dependencyAudit', 'pip-audit -r requirements.lock.txt'],
      ['lockParity', 'python scripts/verify_python_lock.py'],
    ],
    reproduction: [
      ['freshClone', 'make verify-fresh'],
      ['container', 'docker compose up --build'],
    ],
  };
  for (const group of Object.values(gates)) {
    for (const [name, command] of group) {
      requireContract(workflow.includes(command), 'CI missing ' + name + ': ' + command);
    }
  }
  for (const job of ['javascript', 'python', 'fresh-clone-smoke', 'container']) {
    requireContract(new RegExp('^  ' + job + ':', 'mu').test(workflow), 'CI job missing: ' + job);
  }
  requireContract(workflow.includes('pull_request:'), 'CI must run on pull requests');
  const exposedGates = Object.fromEntries(
    Object.entries(gates).map(([name, rows]) => [name, Object.fromEntries(rows)]),
  );
  return {
    schemaVersion: 1,
    commit: sha,
    evidenceType: 'declared-repository-verification-contract',
    executionProof:
      'GitHub Actions workflow/job success is authoritative; this JSON does not assert tests passed',
    package: {
      name: pkg.name,
      version: pkg.version,
      primaryClass: classification.primaryClass,
      maintainedSurfaces: classification.maintainedSurfaces,
      entrypoint: pkg.main,
      jsDirectRuntimeDependencyCount: jsRuntimeDependencies.length,
      jsDirectRuntimeDependencies: jsRuntimeDependencies,
    },
    python: {
      declaredDirectRequirements: [...new Set(declared)].sort(),
      exactPinnedDistributionCount: lockedPython.size,
      lockfile: 'requirements.lock.txt',
      conventionalLockfile: 'requirements.txt',
      declaredFiles: ['requirements.in', 'requirements-dev.txt', 'pyproject.toml'],
    },
    verification: {
      workflow: '.github/workflows/ci.yml',
      gates: exposedGates,
      securityWorkflow: '.github/workflows/codeql.yml',
      docs: ['docs/PROJECT_SCOPE.md', 'docs/MAINTAINED_SURFACE.md'],
    },
  };
}

export async function collectEngineeringEvidence({ sha = process.env.GITHUB_SHA ?? null } = {}) {
  const files = [
    'package.json',
    '.repo-class.json',
    '.github/workflows/ci.yml',
    'requirements.lock.txt',
    'requirements.txt',
    'requirements.in',
    'requirements-dev.txt',
  ];
  const content = await Promise.all(
    files.map((file) => readFile(new URL('../' + file, import.meta.url), 'utf8')),
  );
  return buildEngineeringEvidence({
    pkg: JSON.parse(content[0]),
    classification: JSON.parse(content[1]),
    workflow: content[2],
    pythonLock: content[3],
    pythonConventionalLock: content[4],
    pythonDeclared: content[5],
    pythonDevDeclared: content[6],
    sha,
  });
}

if (process.argv[1] && new URL('file://' + process.argv[1]).href === import.meta.url) {
  try {
    const evidence = await collectEngineeringEvidence();
    const json = JSON.stringify(evidence, null, 2) + '\n';
    const index = process.argv.indexOf('--output');
    if (index >= 0) {
      requireContract(process.argv[index + 1], 'missing --output path');
      await writeFile(process.argv[index + 1], json, { flag: 'w' });
    } else {
      process.stdout.write(json);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
