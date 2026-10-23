# ÆTHERFORGE Commercial Cloud — current operational runbook

**Verified branch:** `feat/aetherforge-workbench-ui` (draft PR #211).
**Application:** `apps/aetherforge-commercial/`, committed as readable source.
**Current cloud build:** `1.5.0-cloud`. No ZIP import, new Codespace, or app installation is needed for an existing checkout on this branch.

## Start in the existing private Codespace

Use the terminal from the repository root:

```bash
cd /workspaces/datafactor-software-engineering-ai-tooling
git status --short
git pull --ff-only origin feat/aetherforge-workbench-ui
bash .devcontainer/start-all.sh
```

If you changed code and need a fresh commercial server process, use:

```bash
bash .devcontainer/start-all.sh --restart
```

The `--restart` flag only terminates the recognized commercial server on 4546; the companion on 4545 is preserved and reused. Never force `git pull` over uncommitted changes. You can also start either app separately:

```bash
bash .devcontainer/start-commercial.sh
bash .devcontainer/start-aetherforge.sh
```

Open **Private port 4546** in the Codespaces Ports tab for the commercial IDE; **Private port 4545** is the original maintained-library companion. Do not make either port public. The Codespaces port proxy provides authentication; the Node server does not provide independent public multi-user authorization.

## Docker and execution readiness

```bash
node .devcontainer/check-environment.mjs
node .devcontainer/verify-execution.mjs
```

The required commercial health check is 4546; the companion 4545 is independently reported and optional for commercial operation. Docker is required only for operator-approved Node/Python execution. Approved preloaded images:

- `gcr.io/distroless/nodejs22-debian13:nonroot`
- `gcr.io/distroless/python3-debian13:nonroot`

Missing images can be explicitly pulled from within the Codespace; they are **never automatically downloaded when executing user projects**. Avoid obsolete `reg.mini.dev` pull commands. Docker execution runs with restricted no-network, no-host-mount, read-only non-root policies and bounded resources.

## Project preservation

Commercial server workspace data is stored under `/workspaces/.aetherforge-data/workspaces`; uploaded assets live under `/workspaces/.aetherforge-data/assets`. Keep the Codespace and that directory when restarting containers. The browser also maintains its own localStorage; not every unsynced browser-only edit is necessarily in the server store. Use **Engineering IDE → Export Project ZIP** for each important project. Verify it includes all required HTML/CSS/JS/Python files and opens via **Import Project ZIP / JSON**.

**Never commit private user workspaces, backups, API keys or credentials to the repository.** Saving in ÆTHERFORGE does not push code to GitHub.

## Verification evidence and remaining release boundaries

- User-operated Codespace: both private services healthy; Docker engine and both approved Distroless images PASS; isolated Node/Python execution PASS.
- GitHub protected checks: Engineering CI, CodeQL, Companion CI, Codespaces Configuration, Commercial Cloud CI and Real Browser Acceptance passed on the validated checkpoint.
- Real Chromium automation: 8 acceptance checks cover desktop/mobile navigation, interactive HTML preview, explicit Node/Python run approvals, project save/reload, and ZIP source round-trip.
- Cloud preflight and holographic plans remain **advisory**, not live deployments or actual quantum computing.
- The source tree is now in PR #211 and the one-time `AETHERFORGE-Commercial-Codespaces-v1.5.0.zip` importer is historical migration tooling only.
- PR remains **draft** until final operator review, source/document reconciliation, and explicit merge authorization. These checks do not establish readiness for public multi-user hosting.

For recovery, inspect `~/.local/state/aetherforge/commercial.log` or `~/.local/state/aetherforge/server.log`; do not delete the Codespace or change host security policies.

## Historical migration note

Earlier revisions required downloading a separate ZIP and running `tools/import-aetherforge-commercial.py`. That procedure is no longer needed for this branch, because the full commercial source is already committed. Historical import scripts remain for audit/replay, not current startup.
