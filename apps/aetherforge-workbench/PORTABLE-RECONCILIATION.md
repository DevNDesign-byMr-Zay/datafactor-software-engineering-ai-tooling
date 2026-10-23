# ÆTHERFORGE portable-to-PR reconciliation

This document records the source-integration boundary for the commercial Engineering Studio.

## Current status

- Draft PR: #211, branch `feat/aetherforge-workbench-ui`.
- Latest portable artifact under review: ÆTHERFORGE v1.3.0, maintained independently as a source ZIP in ChatGPT.
- This repository branch includes the reviewed Minimus sandbox policy and tests, but **not the complete portable v1.3 UI and local-runtime source**.
- The repository's canonical `src/` library, exports, historical provenance, and scoring gates must remain untouched by portable syncing.
- The portable app's own `src/` is a standalone snapshot only, **not an authoritative replacement** for the repository root `src/`.

## Controlled integration

1. Obtain the verified portable-source ZIP from the corresponding ÆTHERFORGE v1.3 release conversation.
2. Clone this repository and check out `feat/aetherforge-workbench-ui`. Verify the exact branch/head and a clean worktree before writing.
3. Run the ZIP's `node tools/sync-github.mjs --repo <absolute-checkout-path>` in dry-run mode. Review changed paths, SHA-256 digests and file counts.
4. Only after review, repeat with `--apply`. It copies app-owned source into `apps/aetherforge-workbench` **only**, never the root maintained library.
5. Review the diff. Run all root gates (surface, release, typecheck, lint, format, coverage and CodeQL), plus companion browser QA, Windows launcher validation, standalone packaging/integrity and protected sandbox tests.
6. Commit/push normally and keep the PR draft until the exact pushed head is green. Never force-push or automatically merge.

## Security and fidelity

- Upstream ROARY/Canva metadata is not an authorization to redistribute binaries or private Google Drive assets.
- A passing isolated Node test does not establish actual Windows first-launch, live Docker image execution or authenticated multi-tenant isolation.
- The external portable synchronization script deliberately refuses to run if the original expected head moved: re-evaluate the branch before applying rather than skipping safety checks.
- No container daemon, Minimus image or untrusted source file should launch automatically with the GUI.

**Do not mark the portable source integrated, Windows-verified, Docker-verified or released based on this documentation alone.**
