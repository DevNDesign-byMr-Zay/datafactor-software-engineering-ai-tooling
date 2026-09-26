# Software Engineering & AI Tooling — Maintained Developer Tooling Library

This repository is a maintained **developer-tooling and reusable-library package** with a canonical public surface under `src/`, maintained Python utilities under `python_support/`, reproducible JavaScript/Python verification, container checks, security analysis, and explicit package exports. The complete historical engineering corpus is preserved outside the scored tree at `archive/historical-corpus-v1.2.2` and release `v1.2.2`.

## Canonical package entrypoint

`package.json` points to:

```text
src/index.js
```

That entrypoint exposes maintained functionality from canonical modules and byte-identical promoted copies under maintained source paths. Consumers and static analyzers do not need to traverse historical revisions.

The maintained surface spans behaviorally distinct artifacts across nine engineering areas:

- Frontend Engineering — adaptive-duration progress controller at `src/promoted/adaptive-duration-progress.js`, preserved byte-for-byte from the released historical source.
- Frontend Engineering — `src/frontend/erase-mask.js`, a canonical extraction of repeated authenticated erase/mask geometry and brush behavior.
- Backend Engineering — `python_support/aster_python_v002.py` prompt, URL, image-prefill, and mask-feather utilities, preserved byte-for-byte from the released historical source.
- Authentication & Security — final token-authentication middleware.
- API Foundations — final CORS policy middleware.
- Storage & File Services — final GCS upload route.
- Storage & File Services — final signed-URL access route.
- AI Model Integration — final file-aware Gemini chat route.
- Reliability & Infrastructure — `src/reliability/backend-config.js`, a canonical extraction of CORS/token/health configuration policy from the authenticated restored backend entrypoint.
- Cloud Deployment — `src/deployment/cloud-run.js`, a credential-free planner that preserves the authenticated Cloud Run env-file deployment and smoke-test behavior while detecting the historical comma-delimited env-var failure shape.
- Application Bootstrap — `src/bootstrap/package-manifest.js`, ESM package-manifest parsing, role-aware bootstrap validation, and npm-script planning derived from the corrected frontend/backend package manifests.

Historical/versioned files remain immutable archive provenance and are not present in the scored maintained tree.

## Repository scope and provenance

The scored tree contains the maintained software package only. The complete released historical corpus remains recoverable from `archive/historical-corpus-v1.2.2`, which points at release commit `25bf8b9e36b327b3001f8b12cd0709cf7f1b84ad`.

The archive preserves **1,610 files / 40 directories / 1,733,733 bytes**. The complete released path/blob/size inventory is committed at `provenance/HISTORICAL_CORPUS_V1_2_2_MANIFEST.json` with inventory digest `cc5592a67d0d68009489b0cc1a6a575f553ff800e7b3d9775c62206d8f863409`.

Historically sourced maintained behavior lives in provenance-bound copies under `src/promoted/` and `python_support/`. Four remain byte-identical; three route modules use a documented relocation-only relative-import rewrite. Original archive paths, archive blob identities, maintained blob identities, and transformations are recorded in provenance metadata.

## Maintained architecture

- `src/index.js` — canonical package boundary and static-analysis entrypoint.
- `src/api/route-safety.js` — dependency-free validation and bounded structured-failure logging shared by the promoted upload, sign, and file-aware chat boundaries.
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
- `.github/workflows/ci.yml` — Drive-independent JavaScript, Python, and container quality gates.
- `.github/workflows/codeql.yml` — JavaScript/Python static security analysis.
- `.github/workflows/format-maintained-js.yml` — deterministic formatting verification for maintained JavaScript.
- `.github/workflows/import-drive.yml` and `verify-drive.yml` — manual-only corpus maintenance workflows.

JavaScript CI fails below 85% statements/functions/lines or 75% branches across the measured maintained surface. Python CI enforces its existing maintained-surface coverage floor.

The ordinary `checkJs` pass covers a wider maintained subset. A separate strict TypeScript configuration blocks regressions in the public authentication, CORS, and backend-configuration APIs without forcing the historical corpus or the full bootstrap graph into strict mode.

## Fresh-clone install

Requirements:

- Node.js 22+
- Python 3.11+ (CI uses 3.12)
- GNU Make optional

```bash
git clone <repository-url>
cd <repository-directory>
make verify-fresh
```

`make verify-fresh` performs the reproducible JavaScript/Python setup and then runs the maintained lint, formatting, tests, coverage, and dependency-audit contract.

Equivalent setup commands:

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
./cloud-run-reliability
./cloud-run-workflow
./cloud-run-release-evidence
./package-manifest
./application-bootstrap
./application-bootstrap-readiness
./application-runtime-acceptance
./holographic-scene-planner
./holographic-capability-negotiation
./holographic-interaction-normalization
./holographic-readiness-routing
./holographic-evidence-envelope
./validated-scene-handoff
./runtime-acceptance-receipt
./runtime-acceptance-consumer
./runtime-acceptance-decision
./json-logger
./error-reporter
```

The root export is `src/index.js`; the listed subpaths are the complete public API declared in `package.json`. This creates an ordinary discoverable software-library boundary while preserving the complete historical source on the immutable archive branch.

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

JavaScript linting covers `src/` and tests. Python checks remain scoped to `python_support/` and maintained Python tests. Promoted copies retain archive-linked content identities and are not formatter-rewritten.

## Dependency and security audit

```bash
make audit
```

This runs npm audit at the moderate threshold and pip-audit against the committed Python lock. Dependabot tracks npm, pip, and GitHub Actions. CodeQL analyzes JavaScript/TypeScript and Python.

## One-command quality check

```bash
make check
```

CI performs reproducible installation, dependency audits, lint/format enforcement, tests, coverage gates, and an independent containerized verification run on pushes and pull requests.

## Container verification

The Docker image installs both committed lockfiles and defaults to the same `make check` contract used by contributors. Compose provides the one-command reproducible verification path:

```bash
docker compose -f docker-compose.yml up --build --abort-on-container-exit --exit-code-from verify
```

The `verify` service has no ports or cloud credentials because this repository is a maintained library/tooling package rather than a long-running web service. It exits non-zero if lint, formatting, dependency audits, JavaScript coverage, or Python coverage fail. CI validates the Compose configuration and runs this container from a fresh checkout.

## Environment, logging, and errors

`.env.example` documents non-secret maintained settings. Credentials and production secrets do not belong in the repository. Maintained Python utilities use `python_support.logging_config` for structured JSON logs and typed/explicit handling of expected parsing failures. Promoted HTTP route artifacts use the maintained route-safety boundary as an explicit request-schema and structured-logging contract: request shapes are bounded before provider/storage calls, log levels are allowlisted, context values are size-limited, and raw upstream error messages are never emitted.

## Test-density and refactoring policy

Test density grows by promoting **distinct, behaviorally meaningful authenticated/final artifacts** into test + coverage + lint enforcement. Repeated behavior found in historical snapshots can be extracted into a canonical maintained module, as with `src/frontend/erase-mask.js`, while the original historical files remain immutable provenance.

Priority order is a review queue, not permission to invent abstractions. If the next historical area does not yet contain enough authenticated behavioral substance for a maintained module, the evidence gap is documented and the corpus remains unchanged until a defensible promotion is available.

This approach improves architecture and maintainability without deleting the historical engineering trajectory or manufacturing hundreds of low-value tests.

## Corpus maintenance and development history

Drive import and verification remain manual-only archive maintenance and are not required to build/test the library. Archive refresh workflows target the archive branch rather than library `main`; the scored tree must remain independent of the historical corpus.

New fixes and features should land as small focused commits paired with the tests that prove them. Historical corpus files are not bulk-reformatted, and repository history is never backdated or fabricated for assessment purposes.

See `CONTRIBUTING.md`, `IMPORT_REPORT.md`, `VERIFY_REPORT.md`, and `docs/MAINTAINED_SURFACE.md` for additional provenance and quality-surface details.


## Release readiness

`npm run verify:release` verifies the repository-level release contract before a real semantic tag is cut: maintained package exports, reproducible lockfiles and CI, dependency audits, container verification, CodeQL coverage, and current changelog evidence. `npm run check` includes this gate so the fresh-clone maintained verification path fails before release metadata drifts.

See `docs/RELEASE_READINESS.md` for the exact boundary. A release-ready commit is not represented as a published release until an actual tag/release is created.

## Shared JavaScript observability

The maintained JavaScript surface exposes `src/observability/json-logger.js` as a shared structured logger. Records contain `timestamp`, `level`, `logger`, `message`, an event name when supplied, and bounded primitive metadata. Route-failure reporting uses this logger by default while preserving explicit injected loggers for tests and integration boundaries.


## Coverage evidence artifacts

The blocking JavaScript and Python coverage gates now retain their outputs as workflow artifacts tied to the tested commit. Jest's generated `coverage/` directory and a standard Python `python-coverage.xml` file are retained for 30 days. Existing coverage thresholds are unchanged.
