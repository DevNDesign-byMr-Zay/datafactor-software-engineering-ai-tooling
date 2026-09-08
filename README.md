# Software Engineering & AI Tooling — Maintained Library + Deidentified Corpus

This repository contains a deidentified software-engineering/AI-tooling corpus **and a canonical maintained library surface at `src/`**. The historical corpus remains preserved under `Software Engineering & AI Tooling/`; the root package exposes selected authenticated/final implementations through a conventional package entrypoint so static analysis can distinguish maintained software from historical provenance.

## Canonical package entrypoint

`package.json` points to:

```text
src/index.js
```

That entrypoint exposes maintained functionality from both canonical extractions and authenticated final corpus artifacts. Consumers and static analyzers no longer have to infer the active surface from hundreds of historical revisions.

The current maintained surface spans **eleven behaviorally distinct artifacts across nine engineering areas**:

- Frontend Engineering — adaptive-duration progress controller from `Aster JavaScript v638.js`.
- Frontend Engineering — `src/frontend/erase-mask.js`, a canonical extraction of repeated authenticated erase/mask geometry and brush behavior.
- Backend Engineering — `Aster Python v002.py` prompt, URL, image-prefill, and mask-feather utilities.
- Authentication & Security — final token-authentication middleware.
- API Foundations — final CORS policy middleware.
- Storage & File Services — final GCS upload route.
- Storage & File Services — final signed-URL access route.
- AI Model Integration — final file-aware Gemini chat route.
- Reliability & Infrastructure — `src/reliability/backend-config.js`, a canonical extraction of CORS/token/health configuration policy from the authenticated restored backend entrypoint.
- Cloud Deployment — `src/deployment/cloud-run.js`, a credential-free planner that preserves the authenticated Cloud Run env-file deployment and smoke-test behavior while detecting the historical comma-delimited env-var failure shape.
- Application Bootstrap — `src/bootstrap/package-manifest.js`, ESM package-manifest parsing, role-aware bootstrap validation, and npm-script planning derived from the corrected frontend/backend package manifests.

Historical/versioned files remain provenance material and are not bulk-modified or falsely counted as maintained production code.

## Repository scope and provenance

The full corpus spans frontend engineering, backend engineering, full-stack workflows, API foundations, AI model integration, cloud/deployment patterns, authentication/security, storage/file services, application bootstrap, and reliability/infrastructure material.

`VERIFY_REPORT.md` records the independent Drive-to-GitHub corpus verification. The mirrored corpus is **1,610 / 1,610 files with zero missing and zero unexpected paths**.

The maintained `src/` modules are deliberately extracted from authenticated historical behavior rather than invented replacements. Their original historical implementations remain intact for provenance and trajectory analysis.

## Maintained architecture

- `src/index.js` — canonical package boundary and static-analysis entrypoint.
- `src/frontend/erase-mask.js` — shared erase/mask geometry, brush normalization, scaling, stroke spacing, and feather policy.
- `src/reliability/backend-config.js` — CORS origin normalization, app-token policy, authorization matching, and deterministic health metadata.
- `src/deployment/cloud-run.js` — Cloud Run deployment argument planning, env-file risk detection, and authenticated smoke-request planning without live cloud credentials.
- `src/bootstrap/package-manifest.js` — corrected package-manifest parsing/validation, historical frontend/backend role classification, and npm-script execution planning.
- `src/workflows/cloud-file-workflow.js` — promoted GCS upload, signed URL, and file-aware AI workflow behavior.
- `tests/js/` — Jest tests for the canonical `src/` modules plus promoted frontend, authentication, CORS, storage, AI, cloud deployment, and bootstrap behavior/failure paths.
- `tests/python/` — pytest coverage for maintained backend utilities.
- `python_support/logging_config.py` — shared JSON logging configuration.
- `docs/MAINTAINED_SURFACE.md` — promotion/test-density policy and measured-artifact inventory.
- `package.json` + `package-lock.json` — JavaScript package surface and reproducible dependency resolution.
- `pyproject.toml` + requirements files/lock — Python metadata, tooling, and resolved dependency snapshot.
- `eslint.config.js` + `.prettierrc.json` — JavaScript quality policy.
- `.github/workflows/ci.yml` — Drive-independent JS/Python quality gates.
- `.github/workflows/codeql.yml` — JavaScript/Python static security analysis.
- `.github/workflows/format-maintained-js.yml` — deterministic formatting verification for maintained JavaScript.
- `.github/workflows/import-drive.yml` and `verify-drive.yml` — manual-only corpus maintenance workflows.

JavaScript CI fails below 85% statements/functions/lines or 75% branches across the measured maintained surface. Python CI enforces its existing maintained-surface coverage floor.

## Fresh-clone install

Requirements:

- Node.js 22+
- Python 3.11+ (CI uses 3.12)
- GNU Make optional

```bash
git clone https://github.com/DevNDesign-byMr-Zay/datafactor-software-engineering-ai-tooling.git
cd datafactor-software-engineering-ai-tooling
make setup
```

Equivalent commands:

```bash
npm ci --ignore-scripts
python -m pip install -r requirements.lock.txt
```

No Google credentials or Drive connection are needed to install, lint, audit, or test the maintained engineering surface.

## Package exports

The package provides explicit export paths for the canonical and promoted modules:

```text
.
./erase-mask
./backend-config
./progress
./auth
./cors
./cloud-run
./package-manifest
```

This creates an ordinary discoverable software-library boundary while preserving all historical source beneath the corpus directory.

## Test

```bash
make test
```

Or:

```bash
npm test
python -m pytest
```

The JS suite includes normal-path, boundary, configuration, cancellation, validation, security, storage, AI integration, erase/mask geometry, reliability configuration, deployment planning, env-file safety, smoke-request construction, and package/bootstrap validation behavior. Tests are added by distinct behavior family rather than by generating shallow assertions for every historical snapshot.

## Lint and format

```bash
make lint
make format-check
```

JavaScript linting covers `src/`, promoted authenticated/final artifacts, and tests. Python checks remain scoped to the maintained Python surface. Historical provenance stays unchanged unless an artifact is intentionally promoted into active maintenance.

## Dependency and security audit

```bash
make audit
```

This runs npm audit at the moderate threshold and pip-audit against the committed Python lock. Dependabot tracks npm, pip, and GitHub Actions. CodeQL analyzes JavaScript/TypeScript and Python.

## One-command quality check

```bash
make check
```

CI performs reproducible installation, dependency audits, lint/format enforcement, tests, and coverage gates on pushes and pull requests.

## Container verification

```bash
docker build -t software-engineering-ai-tooling .
docker run --rm software-engineering-ai-tooling
```

The container exits non-zero if the maintained JavaScript or Python test suites fail.

## Environment, logging, and errors

`.env.example` documents non-secret maintained settings. Credentials and production secrets do not belong in the repository. Maintained Python utilities use `python_support.logging_config` for structured JSON logs and typed/explicit handling of expected parsing failures.

## Test-density and refactoring policy

Test density grows by promoting **distinct, behaviorally meaningful authenticated/final artifacts** into test + coverage + lint enforcement. Repeated behavior found in historical snapshots can be extracted into a canonical maintained module, as with `src/frontend/erase-mask.js`, while the original historical files remain immutable provenance.

Priority order is a review queue, not permission to invent abstractions. If the next historical area does not yet contain enough authenticated behavioral substance for a maintained module, the evidence gap is documented and the corpus remains unchanged until a defensible promotion is available.

This approach improves architecture and maintainability without deleting the historical engineering trajectory or manufacturing hundreds of low-value tests.

## Corpus maintenance and development history

Drive import and live verification remain manual-only and are not required to build/test the library. New fixes and features should land as small focused commits paired with the tests that prove them. Historical corpus files are not bulk-reformatted, and repository history is never backdated or fabricated for assessment purposes.

See `CONTRIBUTING.md`, `IMPORT_REPORT.md`, `VERIFY_REPORT.md`, and `docs/MAINTAINED_SURFACE.md` for additional provenance and quality-surface details.
