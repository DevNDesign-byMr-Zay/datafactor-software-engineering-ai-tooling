# Release Readiness

A release-ready commit is not the same thing as a published release. Cut a tag only for a real maintained milestone after the exact candidate commit has passed the blocking quality and security gates.

## Required maintained evidence

`npm run verify:release` checks the repository-level contract that should remain true before a semantic release:

- stable semantic package version and Node 22+ runtime contract;
- committed npm and Python lockfiles;
- explicit maintained/reference surface verification;
- JavaScript type-check, lint, formatting, and enforced coverage;
- npm and Python dependency audits;
- container verification;
- CodeQL for JavaScript/TypeScript and Python;
- explicit package exports for current runtime-acceptance and holographic evidence contracts;
- an unreleased changelog section describing the actual maintained state.

From a clean checkout:

```bash
npm ci --ignore-scripts
npm run verify:release
npm run check
```

The Python and container lanes remain independently enforced by CI. A hosted release or tag should be created only after the exact candidate commit is green; this document does not claim that a release has already been published.

## Boundary rules

Release readiness does not widen execution authority. Sustainability evidence remains descriptive, holographic readiness remains advisory, runtime-acceptance evidence remains a consumer contract rather than deployment authority, and preserved historical snapshots remain provenance material rather than maintained runtime code.

Do not rewrite historical files to improve release metrics. Release notes should describe only behavior that exists on the maintained surface and has executable verification.

## Release gate tied to actual protected checks

Manual `release/github` dispatch is restricted to `main`. Before any package tests or publication, the workflow verifies that `main` still points to the exact dispatch commit, then retrieves GitHub Actions runs for that SHA. `scripts/verify-release-prerequisites.mjs` **fails closed** unless the latest applicable push runs for both `engineering/ci` and `security/codeql` completed successfully on that exact `main` SHA. Earlier successful runs cannot hide later failures or queued checks.

This check uses GitHub's real run conclusions, not a local certificate. Its `release-prerequisites.json` records the verified commit and relevant run IDs without copying untrusted outputs. The artifact is included in the SHA-256 manifest, uploaded to the retained evidence bundle, and attached to the GitHub release. The full fresh-checkout, Docker verification, SBOM, Python inventory, and checksum validation still run afterward. This policy only applies to **future** releases and does not retroactively modify published v1.2.4 artifacts.

## Published version versus upcoming candidate

The changelog contains a separate `Unreleased` placeholder for future changes and accurately records the published v1.2.5 release with its verified tag, UTC timestamp and commit. The release-readiness test accepts a clearly labeled current published version or a genuinely unreleased candidate matching the package version; it does not misclassify an existing release as unpublished. Updating the changelog does not re-tag or modify the published release.

## Local error collector acceptance

`tests/js/error-webhook-collector.test.js` injects a local HTTP transport into the validated outbound error webhook to prove the actual POST JSON envelope and a rejected-response path. This test does not establish a remote HTTPS connection or configure a production collector; outbound reporting remains explicitly opt-in.

## Hash-verified Python installation

A generated `requirements.hashed.txt` locks SHA-256 wheel and source-distribution hashes for the 42 exact Python distributions in the established lock snapshots. It was created with `uv pip compile --no-deps --generate-hashes --python-version 3.12` and tested with `pip --require-hashes`. Normal setup, fresh-clone CI and Docker now install from the hashed file. The lock verifier rejects mismatched, duplicate, missing or malformed records, while pip verifies downloaded artifact hashes. `pip-audit` continues to audit the pinned versions separately. Future dependency changes must regenerate and review the hashed lock before merging. Initial installation still requires network access. The one-time generation workflow was removed.

## Reproducible release dependency evidence

The future-release `python-dependencies.json` asset is built deterministically from `requirements.lock.txt` and `requirements.hashed.txt` with `scripts/build-locked-python-inventory.mjs`. The builder cross-checks normalized package names, exact versions, and SHA-256 artifact hashes, rejecting differences, missing hashes, duplicate names, and unexpected directives. It includes both input-file SHA-256 digests and the bounded package/hash inventory. This describes **the reproducibly locked dependency graph**, not the incidental Python packages preinstalled on a GitHub runner. The existing separate `python-installed-dependencies.json` CI artifact remains available to inspect actual runner installations. The current published v1.2.6 assets remain unmodified; this safeguard applies only to subsequent releases.
