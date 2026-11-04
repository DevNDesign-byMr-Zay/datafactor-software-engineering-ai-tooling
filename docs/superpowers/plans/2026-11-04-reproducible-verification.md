# Reproducible verification implementation plan

> Implement inline; use existing regression suites plus focused tests, then one independent whole-branch review.

Goal: strengthen reproducible bootstrap, coverage evidence, generated-file protection and runtime observability while preserving the published application and security contracts.

Constraints: retain Node 22+, Python 3.11+ (CI 3.12), 85% statements/functions/lines, 75% branches, private-data redaction, opt-in external telemetry and immutable historical releases. No assessment results belong in the source tree. Real maintenance history must accumulate naturally.

- [x] Coverage: use one canonical JSON Jest configuration, preserve real fail/restore coverage tests and export measured floors/percentages with config/summary hashes. Reject malformed and below-floor summaries. Update every consumer of the old config path.
- [x] Bootstrap: run the documented make verify-fresh inside a no-cache Node 22/Python 3.12 container with no preinstalled project dependencies or registry caches. Fail on contamination or verification failure; retain the CI execution log. Keep independent network-disabled verification.
- [x] Generated source: run read-only generator parity as part of lint. Exercise tampering, missing generated headers and regeneration against disposable files without changing the shipped artifact.
- [x] Observability: exercise both real servers through their default environment-driven webhook wiring, using an isolated local collector transport. Preserve disabled-by-default operation and the allowlisted envelope; document the sole runtime path and configuration.
- [x] Maintenance: report full Git history and recent 50-commit activity separately from a full checkout. Normalize timestamps, reject invalid/duplicate records and label shallow results incomplete. Preserve real history and test-paired focused commits.
- [ ] Commit each concern with its corresponding tests. Run npm run check, Python checks and package/server regressions, obtain local review, publish the branch and verify exact-head CI. Use normal protected review and merge.

Review focus: stale or malformed coverage evidence; lost maintained-source coverage boundaries; dependency caches copied into bootstrap; failed verification masked by a shell pipeline; generated-only edits passing lint; optional telemetry altering HTTP responses or leaking private fields.

Local verification: 104 JavaScript suites / 699 tests; 37 Python tests at 97%; 60 packaging/server/sandbox checks. All existing coverage floors remain met. Independent local review found no critical or important issues. Actual clean-container execution remains pending GitHub CI.
