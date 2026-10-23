# ÆTHERFORGE Commercial Workbench — Codespaces v1.5.0-cloud

**Release status:** PR #211 was merged to `main`. The current cloud source and its tracked startup scripts are available in the repository. The separate namespaced application release is tagged `aetherforge-commercial-v1.5.0-cloud`.

For an existing private Codespace already running the verified workbench:
```bash
cd /workspaces/datafactor-software-engineering-ai-tooling
bash .devcontainer/start-all.sh
```

To load updated source from main, **first preserve any modified/untracked local files**, then switch to `main` and use `git pull --ff-only origin main`. If the Codespace is already on a matching updated branch, no branch switch is needed. After updating server source, run `bash .devcontainer/start-all.sh --restart`. Neither command installs packages or changes your Docker image cache.

Open **private port 4546** for Commercial IDE and **private port 4545** for the original companion. Never mark either port Public. Node.js 22+ is required; Docker and preloaded Google Distroless images are optional for explicitly authorized Node/Python code execution.

The IDE supports editable source, HTML/CSS/JS sandbox previews, server-saved projects, ZIP/JSON export/import, and manually confirmed isolated Docker runs. Cloud Run is planning-only; no AI provider or QPU connection is implied.

**Security:** The Codespaces authenticated private-port proxy provides access protection; the Node service itself is not a public multi-user SaaS authentication layer. Export important projects separately from your browser. Server-managed projects and assets live under `/workspaces/.aetherforge-data` and are not copied into Git or published release ZIPs.

See `docs/AETHERFORGE-COMMERCIAL-CLOUD.md` for backup/recovery and Codespaces details. `README.md` contains historical portable workbench milestones and may refer to obsolete Minimus tags; the current cloud runtime uses Google Distroless.
