# Software Engineering & AI Tooling — Deidentified Engineering Corpus

This repository contains a deidentified software-engineering and AI-tooling corpus plus an executable quality surface for representative maintained/final artifacts. The corpus is preserved under `Software Engineering & AI Tooling/`; engineering checks at the repository root make the assessment installable, testable, lintable, auditable, and security-scannable from a fresh clone without Google Drive access.

## Repository scope

The corpus spans frontend engineering, backend engineering, full-stack workflows, API foundations, AI model integration, cloud/deployment patterns, authentication/security, storage/file services, application bootstrap, and reliability/infrastructure material.

`VERIFY_REPORT.md` records the independent Drive-to-GitHub corpus verification. The current mirrored corpus is **1,610 / 1,610 files with zero missing and zero unexpected paths**.

The executable validation surface currently promotes seven real corpus artifacts across six engineering domains:

- Frontend Engineering — `Aster JavaScript v638.js`: adaptive-duration progress controller.
- Backend Engineering — `Aster Python v002.py`: prompt normalization/chunking, URL hardening, image prefill, and mask feathering utilities.
- Authentication & Security — final token-authentication middleware.
- API Foundations — final CORS policy middleware.
- Storage & File Services — final GCS upload route.
- Storage & File Services — final signed-URL access route.
- AI Model Integration — final file-aware Gemini chat route.

Historical/versioned files remain provenance material. They are not bulk-modified or falsely counted as maintained production code.

## Architecture of the maintained quality surface

- `tests/js/` — Jest coverage for frontend state transitions plus authentication, CORS, upload, signed-URL, and file-aware chat behavior and failure paths.
- `tests/python/` — pytest coverage for prompt normalization/capping/chunking, guidance coercion, HTTP/proxy validation, structured warning emission, image prefill, and mask feathering.
- `python_support/logging_config.py` — shared JSON logging configuration used by maintained Python utilities.
- `docs/MAINTAINED_SURFACE.md` — explicit promotion/test-density policy and measured-artifact inventory.
- `package.json` + `package-lock.json` — JavaScript tooling and reproducible dependency resolution.
- `pyproject.toml`, `requirements.txt`, `requirements-dev.txt`, `requirements.lock.txt` — Python metadata, tooling, and resolved dependency snapshot.
- `eslint.config.js` + `.prettierrc.json` — JavaScript lint/format policy.
- `.github/workflows/ci.yml` — Drive-independent JavaScript and Python quality gates.
- `.github/workflows/codeql.yml` — scheduled and push/PR static analysis for JavaScript and Python.
- `.github/workflows/import-drive.yml` and `verify-drive.yml` — manual-only corpus maintenance workflows.

JavaScript CI measures the promoted JavaScript artifacts together and fails below 85% statements/functions/lines or 75% branches. Python CI fails below 85% line coverage for the maintained `Aster Python v002.py` surface.

## Fresh-clone install

Requirements:

- Node.js 22+
- Python 3.11+ (CI uses 3.12)
- GNU Make is optional but recommended

Clone and install only from committed lockfiles:

```bash
git clone https://github.com/DevNDesign-byMr-Zay/datafactor-software-engineering-ai-tooling.git
cd datafactor-software-engineering-ai-tooling
make setup
```

Equivalent manual commands:

```bash
npm ci --ignore-scripts
python -m pip install -r requirements.lock.txt
```

No Google credentials or Drive connection are needed to install, lint, audit, or test the repository.

## Test

Run both suites:

```bash
make test
```

Or separately:

```bash
npm test
python -m pytest
```

## Lint and format checks

```bash
make lint
make format-check
```

JavaScript linting is enforced across the promoted frontend, authentication/security, API, storage, and AI integration artifacts plus their tests. Python checks are scoped by `pyproject.toml` to the maintained `v002` module, shared support package, and Python tests. This keeps historical provenance intact while the maintained surface expands incrementally.

## Dependency and security audit

```bash
make audit
```

This runs:

```bash
npm audit --audit-level=moderate
pip-audit -r requirements.lock.txt
```

Dependabot is configured for npm, pip, and GitHub Actions. CodeQL separately analyzes JavaScript/TypeScript and Python on main-branch changes, pull requests, and a weekly schedule.

## One-command quality check

After setup:

```bash
make check
```

CI independently performs reproducible install, dependency audits, lint/format enforcement, automated tests, and coverage thresholds on every push and pull request.

## Container verification

The included Dockerfile builds a clean Node 22 + Python test environment from the committed lockfiles:

```bash
docker build -t software-engineering-ai-tooling .
docker run --rm software-engineering-ai-tooling
```

The container exits non-zero if either the JavaScript or Python test suite fails.

## Environment

`.env.example` documents the non-secret Aster settings used by the maintained Python utility. Copy values into your own environment only when you need to change the defaults. No credentials, tokens, or production secrets belong in this repository.

## Logging and error handling

Maintained Python utilities use `python_support.logging_config` for JSON-formatted logs. `Aster Python v002.py` no longer silently swallows the URL/parsing failures covered by the maintained path; expected parsing errors are handled explicitly and emit structured warning events without exposing arbitrary exception messages.

## Test-density policy

Test density is increased by promoting distinct behaviorally meaningful final/canonical artifacts into lint + test + coverage enforcement. The repository does not manufacture shallow tests for every historical snapshot. See `docs/MAINTAINED_SURFACE.md` for the current measured surface and promotion priorities.

## Corpus maintenance

Drive import and live verification are intentionally **manual-only** GitHub Actions workflows. They are not required checks and are not part of the build/test path. This keeps engineering CI deterministic and runnable without external Drive access.

## Development policy

New fixes and features should be committed in small, focused increments with their tests in the same commit whenever possible. Historical corpus files should not be reformatted in bulk merely to satisfy a style tool; move individual modules under active lint/test enforcement as they are changed.

See `CONTRIBUTING.md`, `IMPORT_REPORT.md`, `VERIFY_REPORT.md`, and `docs/MAINTAINED_SURFACE.md` for additional workflow, provenance, and quality-surface details.
