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
| Authentication & Security | authenticated final token middleware + `src/auth/token-auth.js` adapter | OPTIONS, matching token, missing/wrong token, fail-closed configuration, public package API | Included in Jest global threshold |
| API Foundations | authenticated final CORS middleware + `src/api/cors-policy.js` adapter | allowlist, no-Origin requests, denied origins, structured 403 conversion, error propagation, public package API | Included in Jest global threshold |
| Storage & File Services | `Software Engineering & AI Tooling/Storage & File Services/GCS Upload Pipeline/06 FINAL CORRECTED CODE/upload_route.mjs` | upload registration, validation, filename behavior, byte persistence, storage failure | Included in Jest global threshold |
| Storage & File Services | `Software Engineering & AI Tooling/Storage & File Services/Signed URL File Access/06 FINAL CORRECTED CODE/sign_route.mjs` | validation, one-hour read URLs, configuration/signing failures | Included in Jest global threshold |
| AI Model Integration | `Software Engineering & AI Tooling/AI Model Integration/Gemini File Aware Chat Pipeline/06 FINAL CORRECTED CODE/chat_route.mjs` | sessions, empty requests, signing/MIME fallback, storage failures, provider failures | Included in Jest global threshold |
| Cloud Deployment | `src/deployment/cloud-run.js` derived from `Cloud Run Environment Deployment/06 FINAL CORRECTED CODE` | deploy argument construction, env-file safety, comma-delimited failure detection, authenticated health/chat smoke planning, invalid configuration | Included in Jest global threshold |
| Application Bootstrap | `src/bootstrap/package-manifest.js` derived from corrected frontend/backend package manifests | JSON parsing, ESM validation, required scripts, frontend/backend role classification, npm script plans, malformed bootstrap inputs | Included in Jest global threshold |

The established mainline baseline before these promotions was **68 passing JavaScript tests across 12 suites** with **99.15% statements, 89.42% branches, 98.07% functions, and 100% lines**. The Cloud Deployment and Application Bootstrap suites extend that measured surface and remain subject to the same CI floor: 85% statements/functions/lines and 75% branches. The maintained Python surface retains its ≥85% coverage gate. Current branch CI is the authoritative measurement for the expanded surface.

## Refactoring policy

Repeated behavior found in historical revisions can be extracted into a canonical maintained module while the historical sources remain unchanged. `src/frontend/erase-mask.js` consolidates brush geometry and mask-scaling behavior that appeared repeatedly in authenticated Aster snapshots. `src/reliability/backend-config.js` similarly promotes configuration/auth policy from the authenticated restored backend entrypoint. Canonical auth/CORS adapters provide importable package APIs while leaving their authenticated side-effect artifacts untouched.

The Cloud Deployment and Application Bootstrap promotions follow the same rule: they convert authenticated historical behavior into credential-free, testable package utilities while leaving the original Cloud Run scripts and corrected package manifests unchanged.

This gives the repository normal modular architecture without deleting the engineering trajectory that makes the corpus useful for training/evaluation.

## Test-density policy

Test density grows by broadening distinct behavior families under enforcement, not by generating one shallow test for every historical file. A module is promoted when it has a defensible final/canonical role, can execute without private credentials, and has tests for normal behavior, boundaries, configuration, and failures.

## Promotion-readiness review

Priority order is not the same as automatic promotion. Before creating a new maintained module, confirm that the historical evidence supports a meaningful behavior family rather than only a command wrapper, fragment, or environment-specific launch instruction.

A promotion candidate should satisfy all of the following:

1. **Authenticated role** — the source can be tied to a defensible final/canonical artifact or trajectory.
2. **Behavioral substance** — the candidate contains reusable engineering behavior, not only setup commands or a thin invocation wrapper.
3. **Deidentification safety** — private identifiers, infrastructure values, credentials, and buyer-excluded context are not required for the maintained implementation.
4. **Drive-independent execution** — tests and ordinary package use do not require live Drive access or provenance-only systems.
5. **Non-redundancy** — the behavior is not already adequately represented by an existing maintained module.
6. **Testability** — normal paths, boundaries, configuration, and failure behavior can be pinned with focused tests.

If a priority area does not yet meet these conditions, leave its historical files intact and record the evidence gap instead of manufacturing a canonical abstraction.

### Full Stack Workflows readiness note

The current `Full Stack Workflows/Shell/Aster Shell v001.sh` artifact is a minimal bootstrap sequence (`npm install`, `node index.mjs`, and an expected-listener note). On its own, that file is not yet sufficient evidence for a distinct maintained full-stack module. Promotion should wait for authenticated surrounding behavior—such as orchestration, startup validation, process coordination, or other non-redundant workflow logic—or should be paired with stronger trajectory evidence already present elsewhere in the corpus.

This does **not** lower Full Stack Workflows as a priority. It keeps the promotion standard consistent with the established maintained-surface policy.

Cloud Deployment and Application Bootstrap have now moved from the review queue into the maintained surface because their authenticated artifacts met the promotion criteria.

The next high-value review targets are:

1. Full Stack Workflows when stronger non-redundant trajectory evidence is located
2. Additional unique Reliability & Infrastructure modules
3. Additional unique Backend/Frontend modules only when behavior is not redundant
4. Cross-domain workflow abstractions only when they can be traced back to multiple authenticated source behaviors rather than invented from folder names

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
