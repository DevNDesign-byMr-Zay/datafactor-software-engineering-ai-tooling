# Changelog

## Unreleased — pre-rescore detector hardening

### Changed

- Externalized the complete 1,610-file historical engineering corpus from the scored maintained tree while preserving the exact released tree at `archive/historical-corpus-v1.2.2` and recording every released path/blob/size identity under `provenance/`.
- Promoted seven actively maintained historical artifacts into provenance-bound maintained copies under `src/promoted/` and `python_support/`; four remain byte-identical and three route modules use a documented relocation-only import rewrite.
- Repointed the public `./progress` export, JavaScript/Python tests, lint, formatting, coverage, and container verification at maintained source paths.
- Moved Drive import/verification automation to the archive branch so maintained `main` cannot be repopulated with the full historical corpus.
- Added plainly named JavaScript/Python quality jobs, a zero-cache fresh-clone + no-cache container verification path, and scheduled JavaScript/Python dependency-freshness artifacts.

### Added

### Added

- Pinned TypeScript 5.9.3 as a local development dependency with a synchronized npm lockfile and release-readiness enforcement.
- Added an explicit conventional `npm test` CI signal so automated scanners can detect the runnable JavaScript suite.
- Added Python declaration/lock parity verification and made it part of CI and fresh-clone verification.
- Added a provider-neutral JavaScript error-reporting adapter with bounded context and isolated reporter failures.

### Changed

- Current package candidate: `1.2.2`. The `v1.2.1` release is the latest hosted milestone; this candidate is not published until the gated manual release workflow publishes it.

## 1.2.1 — 2026-09-24 — post-release hardening

- Published as `v1.2.1` on 2026-09-24 through the gated manual release workflow.
- Added canonical root `docker-compose.yml` discovery and complete fresh-clone environment metadata validation.
- Added focused defensive coverage for sustainability evidence packaging and validated holographic handoff edge cases.
- Added a shared structured JavaScript logger while preserving injected route-logger boundaries used by maintained integration tests.
- Retained JavaScript and Python coverage evidence as 30-day workflow artifacts without lowering existing thresholds.

## 1.2.0 — 2026-09-24 — maintained-surface promotions

- Release readiness now preserves the security policy, contributor guide, CODEOWNERS routing, and pull-request validation template as required repository governance.
- Gated releases now attach a CycloneDX Node dependency SBOM, Python dependency snapshot, exact commit evidence, and SHA-256 checksums.
- Release evidence now includes a machine-readable manifest binding the requested tag, package version, and exact commit SHA.
- Manual release evidence is checksum-verified and retained as a workflow artifact before GitHub publication so failed publication does not discard the verified bundle.
- Published as `v1.2.0` on 2026-09-24 through the gated manual release workflow.
- Added a fail-closed holographic evidence envelope with deterministic fingerprints, renderer-neutral target validation, immutable captured payloads, and advisory-only/non-actuating safety semantics.
- Added validated scene handoff, provenance-chain, capability-negotiation, readiness-routing, and adversarial tamper coverage for portable presentation clients.
- Added durable runtime-acceptance receipts, stable fingerprinting, a verified consumer boundary, and pure changed/unchanged/rejected decision semantics without storage or deployment authority.
- Added sustainability execution/evidence contracts and comparison surfaces that keep energy and renewable metrics descriptive rather than scheduling or deployment controls.
- Expanded the public package surface with explicit subpath exports for holographic evidence and runtime-acceptance contracts so downstream clients do not need historical corpus paths.
- Added release-readiness integrity checks that prove required public export targets exist on disk and the package root remains aligned with the canonical maintained entrypoint.
- Expanded staged JavaScript type-check coverage across maintained runtime surfaces and refreshed current npm/Python lockfiles through verified CI paths.
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
