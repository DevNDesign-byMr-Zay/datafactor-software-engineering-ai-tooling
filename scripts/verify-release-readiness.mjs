import { access, readFile } from 'node:fs/promises';

const REQUIRED_ENV_KEYS = Object.freeze(['GITHUB_SHA', 'RELEASE_TAG']);

const REQUIRED_FILES = Object.freeze([
  'Dockerfile',
  'compose.yaml',
  'docker-compose.yml',
  '.env.example',
  'CHANGELOG.md',
  'docs/MAINTAINED_SURFACE.md',
  'docs/RELEASE_READINESS.md',
  'requirements.lock.txt',
  'package-lock.json',
  'SECURITY.md',
  'CONTRIBUTING.md',
  '.github/CODEOWNERS',
  '.github/pull_request_template.md',
  'scripts/create-release-manifest.mjs',
  'scripts/verify_python_lock.py',
  '.repo-class.json',
  'docs/PROJECT_SCOPE.md',
]);

const REQUIRED_SCRIPTS = Object.freeze([
  'test:coverage',
  'lint',
  'format:check',
  'typecheck',
  'verify:surface',
  'verify:release',
  'check',
]);

const REQUIRED_EXPORTS = Object.freeze([
  '.',
  './application-runtime-acceptance',
  './holographic-evidence-envelope',
  './validated-scene-handoff',
  './runtime-acceptance-receipt',
  './runtime-acceptance-consumer',
  './runtime-acceptance-decision',
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function text(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

async function json(path) {
  return JSON.parse(await text(path));
}

async function main() {
  const root = new URL('../', import.meta.url);
  await Promise.all(REQUIRED_FILES.map((path) => access(new URL(path, root))));

  const [pkg, changelog, ci, codeql, release, envExample, classification, projectScope] =
    await Promise.all([
      json('package.json'),
      text('CHANGELOG.md'),
      text('.github/workflows/ci.yml'),
      text('.github/workflows/codeql.yml'),
      text('.github/workflows/release.yml'),
      text('.env.example'),
      json('.repo-class.json'),
      text('docs/PROJECT_SCOPE.md'),
    ]);

  assert(/^\d+\.\d+\.\d+$/u.test(pkg.version), 'package version must be a stable semantic version');
  assert(pkg.private === true, 'package must remain private');
  assert(
    classification.primaryClass === 'developer-tooling-library',
    'repository classification must remain developer-tooling-library',
  );
  assert(
    classification.excludedClasses?.includes('infrastructure-as-code'),
    'repository classification must explicitly exclude infrastructure-as-code',
  );
  assert(
    /developer-tooling and reusable-library package/iu.test(projectScope),
    'project scope must preserve the maintained library classification',
  );
  assert(pkg.type === 'module', 'package must remain ESM');
  assert(
    typeof pkg.engines?.node === 'string' && pkg.engines.node.includes('22'),
    'Node 22+ runtime contract is required',
  );

  for (const name of REQUIRED_SCRIPTS) {
    assert(
      typeof pkg.scripts?.[name] === 'string' && pkg.scripts[name].trim(),
      `missing package script: ${name}`,
    );
  }
  for (const name of REQUIRED_EXPORTS) {
    assert(
      typeof pkg.exports?.[name] === 'string' && pkg.exports[name].trim(),
      `missing maintained package export: ${name}`,
    );
    const target = pkg.exports[name];
    assert(
      target.startsWith('./'),
      `maintained package export must remain repository-relative: ${name}`,
    );
    await access(new URL(target, root));
  }
  assert(pkg.main === pkg.exports['.'], 'package main must match the canonical root export');

  assert(
    /## Unreleased/u.test(changelog),
    'changelog must describe the unreleased maintained surface',
  );
  assert(
    changelog.includes(`Current package candidate: \`${pkg.version}\``),
    'changelog candidate version must match package.json',
  );
  assert(
    /No synthetic historical dates, contributors, or tags are asserted/iu.test(changelog),
    'changelog must preserve truthful release-history language',
  );
  for (const key of REQUIRED_ENV_KEYS) {
    assert(new RegExp(`^${key}=`, 'mu').test(envExample), `.env.example must document ${key}`);
  }

  assert(/pull_request:/u.test(ci), 'engineering CI must run for pull requests');
  assert(/npm ci --ignore-scripts/u.test(ci), 'engineering CI must use reproducible npm install');
  assert(
    /npm audit --audit-level=moderate/u.test(ci),
    'engineering CI must audit npm dependencies',
  );
  assert(
    /npm run verify:surface/u.test(ci),
    'engineering CI must verify maintained/reference boundaries',
  );
  assert(/npm run typecheck/u.test(ci), 'engineering CI must type-check maintained JavaScript');
  assert(/npm run format:check/u.test(ci), 'engineering CI must enforce formatting');
  assert(/npm test/u.test(ci), 'engineering CI must expose the conventional npm test suite');
  assert(/npm run test:coverage/u.test(ci), 'engineering CI must enforce JavaScript coverage');
  assert(
    /path:\s*coverage\//u.test(ci) &&
      /coverage xml -o python-coverage\.xml/u.test(ci) &&
      /path:\s*python-coverage\.xml/u.test(ci) &&
      /actions\/upload-artifact@v7/u.test(ci),
    'engineering CI must retain JavaScript and Python coverage evidence',
  );
  assert(
    /pip-audit -r requirements\.lock\.txt/u.test(ci),
    'engineering CI must audit Python dependencies',
  );
  assert(
    /python scripts\/verify_python_lock\.py/u.test(ci),
    'engineering CI must verify Python declaration/lock parity',
  );
  assert(
    /docker compose -f docker-compose\.yml config --quiet/u.test(ci),
    'engineering CI must validate canonical docker-compose.yml',
  );
  assert(/docker compose up --build/u.test(ci), 'engineering CI must prove container verification');
  assert(/pull_request:/u.test(codeql), 'CodeQL must run for pull requests');
  assert(
    /javascript-typescript/u.test(codeql) && /python/u.test(codeql),
    'CodeQL must analyze JavaScript and Python',
  );
  assert(/workflow_dispatch:/u.test(release), 'GitHub release workflow must remain manual-only');
  assert(/github\.ref == 'refs\/heads\/main'/u.test(release), 'release workflow must require main');
  assert(
    /make verify-fresh/u.test(release),
    'release workflow must verify a fresh maintained checkout',
  );
  assert(
    /Requested tag must equal/u.test(release),
    'release workflow must bind the tag to package version',
  );
  assert(
    /npm sbom --sbom-format=cyclonedx/u.test(release),
    'release workflow must generate a dependency SBOM',
  );
  assert(
    /python -m pip list --format=json/u.test(release),
    'release workflow must snapshot Python dependencies',
  );
  assert(
    /release-artifacts\.sha256/u.test(release),
    'release workflow must checksum attached evidence',
  );
  assert(
    /release-manifest\.json/u.test(release),
    'release workflow must attach an exact provenance manifest',
  );
  assert(
    /RELEASE_TAG/u.test(release) && /GITHUB_SHA/u.test(release),
    'release manifest must bind requested tag and exact commit',
  );
  assert(
    /sha256sum --check release-artifacts\.sha256/u.test(release),
    'release workflow must verify its evidence checksums before publication',
  );
  assert(
    /actions\/upload-artifact@v7/u.test(release),
    'release workflow must retain the verified evidence bundle as a workflow artifact',
  );
  assert(/retention-days: 30/u.test(release), 'release evidence retention must remain explicit');

  assert(
    /node scripts\/create-release-manifest\.mjs/u.test(release),
    'release workflow must use the validated manifest generator',
  );
  assert(
    /node scripts\/create-release-manifest\.mjs/u.test(ci),
    'quality workflow must smoke-test release manifest generation',
  );
  assert(
    /gh release create/u.test(release),
    'release workflow must publish through GitHub Releases',
  );

  process.stdout.write(
    `release readiness verified: v${pkg.version}, maintained exports and reproducible quality gates present\n`,
  );
}

await main();
