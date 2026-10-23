# ÆTHERFORGE Commercial — v1.5.0-cloud

The first tagged cloud-commercial ÆTHERFORGE release, source-backed by the merged workbench and maintained Software Engineering library.

## Included
- Modernized responsive Commercial Engineering IDE with editable multi-file projects, isolated HTML/CSS/JS viewport, source ZIP / JSON import/export, Saved Projects, server-backed persistence and explicit status feedback.
- Node.js and Python project execution through approved preloaded Google Distroless Docker images only; requires operator confirmation and denies network, host mounts and privileged container execution.
- Original maintained-library companion with Module Library, Workflow Studio, Evidence Center, Sustainability Lab, Asset Studio and Engineering Guide.
- Both private Codespaces startup services (4546 Commercial and 4545 Companion); optional local Node.js 22+ loopback server usage.
- Private on-demand server-state backup utility, versioned source inventory and SHA-256 checksums.

## Evidence
PR #211 merged in commit `5249adde325f5d2330ab84399c16332413d62c8e`. Six GitHub CI workflows and ten Chromium browser acceptance scenarios passed the release candidate, including actual Node/Python Docker runs and project ZIP round-trip. The final release workflow re-verifies packaged artifact integrity.

## Install
1. Download `AETHERFORGE-Commercial-v1.5.0-cloud.zip` below and the matching SHA-256 checksum file.
2. Extract, open `START-HERE.md`. The ZIP is a **source bundle**, not an administrator-free Windows executable, iOS binary or direct-file auto-start HTML.
3. Existing Codespaces users may instead run `bash .devcontainer/start-all.sh` from the matching repository checkout. **Ports 4545 and 4546 must stay PRIVATE**.

**Security and scope:** No exported user projects, credentials, access tokens or backups are included. Cloud Run and holographic capabilities remain advisory; no live AI or quantum execution is represented as enabled. Public multitenant hosting is not supported by the Codespaces adapter.
