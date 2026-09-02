# Maintained and Tested Engineering Surface

This repository preserves a 1,610-file deidentified engineering corpus while incrementally promoting representative final/canonical artifacts into an executable quality surface. Historical versioned files remain provenance material; they are not bulk-rewritten or mislabeled as current production modules.

## Current measured modules

| Domain | Source artifact | Test surface | Enforced coverage |
| --- | --- | --- | --- |
| Frontend Engineering | `Software Engineering & AI Tooling/Frontend Engineering/JavaScript/Aster JavaScript v638.js` | start/finish/cancel state transitions, adaptive duration learning, persistence, invalid configuration, async success/failure, disconnect, progress clamping | Included in Jest global threshold |
| Backend Engineering | `Software Engineering & AI Tooling/Backend Engineering/Python/Aster Python v002.py` | prompt normalization/capping/chunking, guidance coercion, URL/proxy hardening, structured failures, image prefill, mask feathering | Python line coverage must be at least 85% |
| Authentication & Security | `Software Engineering & AI Tooling/Authentication & Security/Token Authentication Regression/06 FINAL CORRECTED CODE/auth_middleware.mjs` | OPTIONS behavior, matching token, missing/wrong token, fail-closed configuration | Included in Jest global threshold |
| API Foundations | `Software Engineering & AI Tooling/API Foundations/Express Gemini Backend Foundation/06 FINAL CORRECTED CODE/cors_policy.mjs` | normalized allowlist, no-Origin requests, denied origins, structured 403 conversion, unrelated error propagation | Included in Jest global threshold |

JavaScript coverage fails CI below 85% statements/functions/lines or 75% branches across the measured JavaScript artifacts. Python coverage fails CI below 85% for the maintained `Aster Python v002.py` module.

## Test-density policy

Test density is increased by broadening the number of distinct, behaviorally meaningful corpus modules under enforcement, not by generating shallow tests for every historical snapshot. A module is promoted into the maintained surface when it has a clear final/canonical role, can be executed deterministically without private credentials, and has tests that cover normal behavior, boundaries, and failures.

Priority promotion order:

1. Authentication & Security
2. API Foundations
3. Reliability & Infrastructure
4. Storage & File Services
5. AI Model Integration
6. Backend Engineering
7. Frontend Engineering
8. Full Stack Workflows
9. Cloud Deployment
10. Application Bootstrap

Each newly promoted module should arrive in a focused commit with its tests, then be added to lint/coverage enforcement. Historical source files remain intact for provenance.

## Required quality gates

Every push and pull request runs a Drive-independent workflow that performs reproducible dependency installation, dependency audits, lint/format checks, automated tests, and coverage thresholds. A weekly scheduled run repeats the same checks against current vulnerability databases.

The Drive import and live corpus-verification workflows are maintenance utilities only. They are manual and do not participate in engineering CI.

## Local verification

```bash
npm ci --ignore-scripts
python -m pip install -r requirements.lock.txt
npm run test:coverage
python -m coverage run -m pytest
python -m coverage report --include="Software Engineering & AI Tooling/Backend Engineering/Python/Aster Python v002.py" --fail-under=85
```

See the root `README.md`, `CONTRIBUTING.md`, `VERIFY_REPORT.md`, and `.github/workflows/ci.yml` for onboarding, provenance, and CI details.
