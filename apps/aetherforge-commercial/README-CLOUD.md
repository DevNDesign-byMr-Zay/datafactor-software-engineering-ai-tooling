# ÆTHERFORGE Commercial Workbench — Codespaces v1.5.0-cloud

**Current source is committed in draft PR #211.** For an existing Codespace, do not re-import the old ZIP or overwrite the installed app.

```bash
cd /workspaces/datafactor-software-engineering-ai-tooling
git pull --ff-only origin feat/aetherforge-workbench-ui
bash .devcontainer/start-all.sh
```

On code updates, use `bash .devcontainer/start-all.sh --restart`. Open **private port 4546** for the commercial IDE and **private port 4545** for the maintained-library companion. No Docker installation, Windows administrator rights, or new Codespace is required when the existing cloud Docker daemon is ready.

The Engineering IDE supports editable source projects, browser previews, server-backed saved projects, source ZIP export/import, and operator-confirmed Docker execution of Node/Python with preloaded Google Distroless images. Docker execution denies networking and host-folder mounts and restricts CPU, memory, PIDs, output and time. Cloud Run remains planning-only; AI/model integrations are not implied.

**Security:** The Codespaces authenticated private-port proxy is required for access protection. Do not publish either port. Export important projects from the IDE; the server writes to `/workspaces/.aetherforge-data`, and browser localStorage may hold unsynced edits. No project is pushed to GitHub automatically.

Full operational/recovery guide: `docs/AETHERFORGE-COMMERCIAL-CLOUD.md`. The older `README.md` contains historical portable v0.x notes and obsolete Minimus image references; this cloud README supersedes those instructions.
