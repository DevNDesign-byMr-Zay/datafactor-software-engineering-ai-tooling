# Maintained and Tested Engineering Surface

This repository preserves a 1,610-file deidentified engineering corpus while exposing a conventional maintained package at `src/`. Historical versioned files remain provenance material; representative authenticated/final behavior is promoted into lint, test, and coverage enforcement without rewriting the originals.

## Canonical package boundary

`package.json` points to `src/index.js`. The canonical `src/` layer gives consumers and static analyzers a clear active software surface instead of requiring them to infer maintained behavior from historical snapshots.

## Current measured modules

| Domain | Source artifact | Test surface | Enforced coverage |
| --- | --- | --- | --- |
| Frontend Engineering | `src/frontend/erase-mask.js` | brush-size/shape normalization, feather policy, stroke spacing, display-to-mask scaling, mask brush scaling | Included in Jest global threshold |
| Frontend Engineering | `Software Engineering & AI Tooling/Frontend Engineering/JavaScript/Aster JavaScript v638.js` | start/finish/cancel transitions, adaptive learning, persistence, invalid configuration, async success/failure, disconnect, clamping | Included in Jest global threshold |
| Backend Engineering | `Software Engineering & AI Tooling/Backend Engineering/Python/Aster Python v002.py` | prompt normalization/capping/chunking, guidance coercion, URL/proxy hardening, structured failures, image prefill, mask feathering | Python line coverage ≥85% |
| Reliability & Infrastructure | `src/reliability/backend-config.js` | CORS allowlist parsing, origin policy, fail-closed app-token authorization, deterministic health metadata | Included in Jest global threshold |
| Authentication & Security | `Software Engineering & AI Tooling/Authentication & Security/Token Authentication Regression/06 FINAL CORRECTED CODE/auth_middleware.mjs` | OPTIONS, matching token, missing/wrong token, fail-closed configuration | Included in Jest global threshold |
| API Foundations | `Software Engineering & AI Tooling/API Foundations/Express Gemini Backend Foundation/06 FINAL CORRECTED CODE/cors_policy.mjs` | allowlist, no-Origin requests, denied origins, structured 403 conversion, error propagation | Included in Jest global threshold |
| Storage & File Services | `Software Engineering & AI Tooling/Storage & File Services/GCS Upload Pipeline/06 FINAL CORRECTED CODE/upload_route.mjs` | upload registration, validation, filename behavior, byte persistence, storage failure | Included in Jest global threshold |
| Storage & File Services | `Software Engineering & AI Tooling/Storage & File Services/Signed URL File Access/06 FINAL CORRECTED CODE/sign_route.mjs` | validation, one-hour read URLs, configuration/signing failures | Included in Jest global threshold |
| AI Model Integration | `Software Engineering & AI Tooling/AI Model Integration/Gemini File Aware Chat Pipeline/06 FINAL CORRECTED CODE/chat_route.mjs` | sessions, empty requests, signing/MIME fallback, storage failures, provider failures | Included in Jest global threshold |

The current JavaScript suite contains **63 passing tests across 10 suites**. The measured JavaScript surface is **99.07% statements, 86.01% branches, 97.77% functions, and 100% lines**. CI fails below 85% statements/functions/lines or 75% branches. The maintained Python surface retains its ≥85% coverage gate.

## Refactoring policy

Repeated behavior found in historical revisions can be extracted into a canonical maintained module while the historical sources remain unchanged. `src/frontend/erase-mask.js` is the first explicit example: it consolidates brush geometry and mask-scaling behavior that appeared repeatedly in authenticated Aster snapshots. `src/reliability/backend-config.js` similarly promotes configuration/auth policy from the authenticated restored backend entrypoint.

This gives the repository normal modular architecture without deleting the engineering trajectory that makes the corpus useful for training/evaluation.

## Test-density policy

Test density grows by broadening distinct behavior families under enforcement, not by generating one shallow test for every historical file. A module is promoted when it has a defensible final/canonical role, can execute without private credentials, and has tests for normal behavior, boundaries, configuration, and failures.

The next high-value promotion targets are:

1. Full Stack Workflows
2. Cloud Deployment
3. Application Bootstrap
4. Additional unique Reliability & Infrastructure modules
5. Additional unique Backend/Frontend modules only when behavior is not redundant

Each promotion should land as a focused feature/refactor plus its tests, then join lint/coverage enforcement.

## Required quality gates

Every push and pull request runs Drive-independent reproducible installs, dependency audits, lint/format checks, tests, and coverage thresholds. A weekly scheduled run repeats those checks against current vulnerability databases. CodeQL separately analyzes the maintained JavaScript/TypeScript and Python surface.

Drive import and live corpus verification remain manual maintenance utilities and are not build dependencies.

## Local verification

```bash
npm ci --ignore-scripts
python -m pip install -r requirements.lock.txt
npm run test:coverage
python -m coverage run -m pytest
python -m coverage report --include="Software Engineering & AI Tooling/Backend Engineering/Python/Aster Python v002.py" --fail-under=85
```

See `README.md`, `CONTRIBUTING.md`, `VERIFY_REPORT.md`, and `.github/workflows/ci.yml` for onboarding, provenance, and CI details.
