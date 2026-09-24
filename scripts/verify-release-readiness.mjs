import { access, readFile } from 'node:fs/promises';

const REQUIRED_FILES = Object.freeze([
  'Dockerfile',
  'compose.yaml',
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

  const [pkg, changelog, ci, codeql, release] = await Promise.all([
    json('package.json'),
    text('CHANGELOG.md'),
    text('.github/workflows/ci.yml'),
    text('.github/workflows/codeql.yml'),
    text('.github/workflows/release.yml'),
  ]);

  assert(/^\d+\.\d+\.\d+$/u.test(pkg.version), 'package version must be a stable semantic version');
  assert(pkg.private === true, 'package must remain private');
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
  assert(/npm run test:coverage/u.test(ci), 'engineering CI must enforce JavaScript coverage');
  assert(
    /pip-audit -r requirements\.lock\.txt/u.test(ci),
    'engineering CI must audit Python dependencies',
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
    /gh release create/u.test(release),
    'release workflow must publish through GitHub Releases',
  );

  process.stdout.write(
    `release readiness verified: v${pkg.version}, maintained exports and reproducible quality gates present\n`,
  );
}

await main();
