# Software Engineering & AI Tooling — Deidentified Engineering Corpus

This repository contains a deidentified software-engineering and AI-tooling corpus plus an executable quality surface for selected maintained Aster utilities. The corpus is preserved under `Software Engineering & AI Tooling/`; engineering checks at the repository root make the assessment installable, testable, lintable, and auditable from a fresh clone without Google Drive access.

## Repository scope

The corpus spans frontend engineering, backend engineering, full-stack workflows, API foundations, AI model integration, cloud/deployment patterns, authentication/security, storage/file services, application bootstrap, and reliability/infrastructure material.

`VERIFY_REPORT.md` records the independent Drive-to-GitHub corpus verification. The current mirrored corpus is **1,610 / 1,610 files with zero missing and zero unexpected paths**.

The executable validation surface intentionally starts with two real corpus modules named in assessment feedback:

- `Software Engineering & AI Tooling/Frontend Engineering/JavaScript/Aster JavaScript v638.js` — adaptive-duration progress controller.
- `Software Engineering & AI Tooling/Backend Engineering/Python/Aster Python v002.py` — prompt normalization/chunking, fill-guidance coercion, URL hardening, canvas prefill, and mask feathering utilities.

## Architecture of the maintained quality surface

- `tests/js/aster-javascript-v638.test.js` — Jest tests for start/finish/cancel transitions, learned duration estimates, and progress clamping.
- `tests/python/test_aster_python_v002.py` — pytest coverage for prompt normalization, capping, chunking, guidance coercion, HTTP URL validation, and structured warning emission.
- `python_support/logging_config.py` — shared JSON logging configuration used by maintained Python utilities.
- `package.json` + `package-lock.json` — JavaScript tooling and reproducible dependency resolution.
- `pyproject.toml`, `requirements.txt`, `requirements-dev.txt`, `requirements.lock.txt` — Python metadata, tooling, and resolved dependency snapshot.
- `eslint.config.js` + `.prettierrc.json` — JavaScript lint/format policy.
- `.github/workflows/ci.yml` — Drive-independent JavaScript and Python quality gates.
- `.github/workflows/import-drive.yml` and `verify-drive.yml` — manual-only corpus maintenance workflows.

## Fresh-clone install

Requirements:

- Node.js 20+
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

JavaScript checks are currently enforced on the maintained `v638` module and its tests. Python checks are scoped by `pyproject.toml` to the maintained `v002` module, shared support package, and Python tests. This keeps the historical corpus intact while new or actively maintained modules are brought under enforcement incrementally.

## Dependency and security audit

```bash
make audit
```

This runs:

```bash
npm audit --audit-level=high
pip-audit -r requirements.lock.txt
```

Dependabot is configured for npm, pip, and GitHub Actions.

## One-command quality check

After setup:

```bash
make check
```

CI performs the same categories independently on every push and pull request: reproducible install, dependency audit, lint/format enforcement, and automated tests.

## Container verification

The included Dockerfile builds a clean Node + Python test environment from the committed lockfiles:

```bash
docker build -t software-engineering-ai-tooling .
docker run --rm software-engineering-ai-tooling
```

The container exits non-zero if either the JavaScript or Python test suite fails.

## Environment

`.env.example` documents the non-secret Aster settings used by the maintained Python utility. Copy values into your own environment only when you need to change the defaults. No credentials, tokens, or production secrets belong in this repository.

## Logging and error handling

Maintained Python utilities use `python_support.logging_config` for JSON-formatted logs. `Aster Python v002.py` no longer silently swallows the URL/parsing failures covered by the maintained path; expected parsing errors are handled explicitly and emit structured warning events without exposing arbitrary exception messages.

## Corpus maintenance

Drive import and live verification are intentionally **manual-only** GitHub Actions workflows. They are not required checks and are not part of the build/test path. This keeps engineering CI deterministic and runnable without external Drive access.

## Development policy

New fixes and features should be committed in small, focused increments with their tests in the same commit whenever possible. Historical corpus files should not be reformatted in bulk merely to satisfy a style tool; move individual modules under active lint/test enforcement as they are changed.

See `CONTRIBUTING.md`, `IMPORT_REPORT.md`, and `VERIFY_REPORT.md` for additional workflow and provenance details.
