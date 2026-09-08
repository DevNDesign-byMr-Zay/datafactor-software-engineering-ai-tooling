# Changelog

## Unreleased — maintained-surface promotions

- Added promotion-readiness criteria that require authenticated role, behavioral substance, deidentification safety, Drive-independent execution, non-redundancy, and focused testability before historical artifacts become maintained modules.
- Promoted authenticated Cloud Run environment-deployment behavior into `src/deployment/cloud-run.js` with credential-free deploy argument planning, comma-delimited env-var risk detection, env-file-sensitive key reporting, and authenticated `/health` + `/chat` smoke-request planning.
- Added focused Cloud Run deployment tests for default/custom deploy arguments, malformed configuration, historical comma-delimited env-var failure detection, URL normalization, authenticated smoke requests, and combined deployment plans.
- Promoted corrected package/bootstrap behavior into `src/bootstrap/package-manifest.js` with JSON parsing, ESM manifest validation, required-script checks, historical frontend/backend role classification, npm-script plans, and role-aware bootstrap review output.
- Added focused package/bootstrap tests against the corrected frontend/backend manifest shapes and malformed/missing bootstrap inputs.
- Added `./cloud-run` and `./package-manifest` package exports and exposed both maintained modules from `src/index.js`.
- Kept the Full Stack Workflows shell artifact as historical provenance rather than inventing a maintained abstraction from a minimal install/start wrapper; documented the evidence needed before promotion.
- Updated the README and maintained-surface inventory to describe eleven behaviorally distinct maintained artifacts across nine engineering areas.
- Preserved every historical corpus artifact unchanged; all new maintained behavior is derived into `src/` and tested independently of private cloud credentials or Drive access.

## 1.1.0 — Canonical maintained package

- Added conventional `src/index.js` package entrypoint and explicit package exports.
- Extracted repeated authenticated erase/mask behavior into `src/frontend/erase-mask.js` without rewriting historical snapshots.
- Extracted restored-backend CORS/token/health configuration policy into `src/reliability/backend-config.js`.
- Added canonical token-authentication and CORS adapters that preserve the behavior of the authenticated final artifacts while providing importable package APIs.
- Added focused tests for canonical geometry, reliability configuration, auth/CORS adapters, and the public package entrypoint.
- Expanded lint, formatting, and coverage enforcement to the canonical `src/` surface.
- Updated maintained-surface documentation with measured test/coverage evidence and future promotion priorities.
- Merged the canonical maintained surface through PR #7 with focused commit history preserved.
- Verified 12/12 JavaScript suites and 68/68 JavaScript tests with 99.15% statements, 89.42% branches, 98.07% functions, and 100% lines on the measured JavaScript surface.
- Verified JavaScript and Python quality jobs, dependency audits, lint/format gates, and CodeQL analysis on the merged mainline change.
- Refreshed the generated Python dependency lock after merge; the automated refresh advanced `anyio` from 4.14.2 to 4.15.0.

## 1.0.0 — Engineering quality baseline

- Added root npm and Python project manifests.
- Added generated npm and Python dependency lockfiles.
- Added Jest coverage for `Aster JavaScript v638.js` progress state transitions and clamping.
- Added pytest coverage for `Aster Python v002.py` prompt, guidance, URL, and chunking behavior.
- Replaced maintained `v002` bare exception swallowing with explicit typed handling and structured warning events.
- Added shared JSON Python logging configuration.
- Added ESLint, Prettier, Ruff, npm audit, and pip-audit quality gates.
- Added Drive-independent JavaScript and Python CI jobs.
- Moved Drive import and live verification workflows to manual-only maintenance.
- Added Dependabot, Makefile workflow, Docker verification, environment template, contribution guidance, and expanded fresh-clone documentation.

This changelog records real repository work. No synthetic historical dates, contributors, or tags are asserted.
