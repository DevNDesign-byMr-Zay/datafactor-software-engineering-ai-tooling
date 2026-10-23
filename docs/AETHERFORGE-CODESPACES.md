# ÆTHERFORGE in GitHub Codespaces

This configuration lives on draft PR #211 (`feat/aetherforge-workbench-ui`). It provisions a cloud Linux development container with **Node 22**, Docker-in-Docker, and private forwarding for the **existing repository companion app**. The independent portable ÆTHERFORGE v1.4.2 commercial UI is **not yet merged into this branch**.

## Start on iPhone

Open https://codespaces.new/DevNDesign-byMr-Zay/datafactor-software-engineering-ai-tooling/tree/feat/aetherforge-workbench-ui and create a codespace. It is tied to your GitHub account and may consume included or billable Codespaces quota. Allow the dev container build to complete. The trusted companion starts on port 4545 automatically. From the Codespaces **Ports** tab, open 4545 in Browser. Keep visibility **Private**. Never make port 4545 public; the local app is not a multi-tenant authenticated public service.

In the cloud terminal run:

```bash
node .devcontainer/check-environment.mjs
```

This reports the actual Docker daemon and approved Minimus image readiness. It does **not** download images. After confirming the engine is working, you may explicitly run:

```bash
docker pull reg.mini.dev/node:22
docker pull reg.mini.dev/python:3.13
node .devcontainer/check-environment.mjs
```

These commands operate **inside Codespaces**, not on the iPhone or Windows computer. Images may require available pull quota or registry authentication. Do not paste access tokens into committed source.

## Runtime and security boundaries

- Docker-in-Docker comes from the supported Dev Containers feature; successful provisioning must be verified in the created codespace, not inferred from this JSON.
- The Docker images are for explicit isolated execution. Creating a codespace does **not** automatically connect the portable ÆTHERFORGE `Run Project` button to Docker, nor does the draft branch yet contain the portable commercial IDE.
- Never publish Docker's TCP socket, mount the host's Docker socket into an untrusted application, or make the forwarded app port public.
- The companion Node server binds to `0.0.0.0` **only** when both `CODESPACES=true` and `AETHERFORGE_CODESPACES_BIND=1` are set by the private dev container startup. Local Windows defaults remain `127.0.0.1`.
- Startup does **not** install packages from an untrusted source, pull Minimus images, run arbitrary code, or deploy infrastructure.
- To see startup errors, inspect `~/.local/state/aetherforge/server.log`.
- Shut down the codespace when finished to conserve usage.
- For actual remote project execution, integrate the versioned portable IDE, implement an authenticated backend execution adapter, enforce per-user quotas, and verify sandbox isolation before enabling the UI control.
