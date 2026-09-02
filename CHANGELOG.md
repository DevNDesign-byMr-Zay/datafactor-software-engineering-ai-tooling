# Changelog

## Unreleased — Canonical maintained package

- Added conventional `src/index.js` package entrypoint and explicit package exports.
- Extracted repeated authenticated erase/mask behavior into `src/frontend/erase-mask.js` without rewriting historical snapshots.
- Extracted restored-backend CORS/token/health configuration policy into `src/reliability/backend-config.js`.
- Added canonical token-authentication and CORS adapters that preserve the behavior of the authenticated final artifacts while providing importable package APIs.
- Added focused tests for canonical geometry, reliability configuration, auth/CORS adapters, and the public package entrypoint.
- Expanded lint, formatting, and coverage enforcement to the canonical `src/` surface.
- Updated maintained-surface documentation with measured test/coverage evidence and future promotion priorities.

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
