# ÆTHERFORGE in GitHub Codespaces

This configuration lives on draft PR #211 (`feat/aetherforge-workbench-ui`). It provisions a cloud Linux development container with **Node 22**, Docker-in-Docker, and private forwarding for the **existing repository companion app**. The independent portable ÆTHERFORGE v1.4.2 commercial UI is **not yet merged into this branch**.

## Start on iPhone

Open https://codespaces.new/DevNDesign-byMr-Zay/datafactor-software-engineering-ai-tooling/tree/feat/aetherforge-workbench-ui and create a codespace. It is tied to your GitHub account and may consume included or billable Codespaces quota. Allow the dev container build to complete. Start the trusted companion manually from the Codespaces terminal with `bash .devcontainer/start-aetherforge.sh`, then open the private port 4545 in Browser from the **Ports** tab. Automatic start is deliberately disabled as a container-lifecycle prerequisite so a backend failure does not send the entire Codespace into recovery mode. Keep visibility **Private**. Never make port 4545 public; the local app is not a multi-tenant authenticated public service.

In the cloud terminal run:

```bash
node .devcontainer/check-environment.mjs
```

This reports the actual Docker daemon and approved Google Distroless image readiness. It does **not** download images. After confirming the engine is working, you may explicitly run:

```bash
docker pull gcr.io/distroless/nodejs22-debian13:nonroot
docker pull gcr.io/distroless/python3-debian13:nonroot
node .devcontainer/check-environment.mjs
```

These commands operate **inside Codespaces**, not on the iPhone or Windows computer. Images may require available pull quota or registry authentication. Do not paste access tokens into committed source.

## Runtime and security boundaries

- Docker-in-Docker comes from the supported Dev Containers feature; successful provisioning must be verified in the created codespace, not inferred from this JSON.
- The Docker images are for explicit isolated execution. Creating a codespace does **not** automatically connect the portable ÆTHERFORGE `Run Project` button to Docker, nor does the draft branch yet contain the portable commercial IDE.
- Never publish Docker's TCP socket, mount the host's Docker socket into an untrusted application, or make the forwarded app port public.
- The companion Node server binds to `0.0.0.0` **only** when both `CODESPACES=true` and `AETHERFORGE_CODESPACES_BIND=1` are set by the private dev container startup. Local Windows defaults remain `127.0.0.1`.
- Startup does **not** install packages from an untrusted source, pull Google Distroless images, run arbitrary code, or deploy infrastructure.
- To see startup errors, inspect `~/.local/state/aetherforge/server.log`.
- Shut down the codespace when finished to conserve usage.
- For actual remote project execution, integrate the versioned portable IDE, implement an authenticated backend execution adapter, enforce per-user quotas, and verify sandbox isolation before enabling the UI control.

## Registry migration (2026-10-23)

Minimus publicly announced the permanent shutdown of `reg.mini.dev` on 2026-10-22. New pulls fail with HTTP 403 even without a network or Docker defect. The Codespaces checker and sandbox policy now target active Google Distroless images. Reference: https://www.minimus.io/get-started and https://github.com/GoogleContainerTools/distroless.

Node and Python Distroless images define the language binary as an OCI ENTRYPOINT. Use `docker run <flags> <image> -e 'console.log(1)'` for Node and `docker run <flags> <image> -c 'print(1)'` for Python. Do not duplicate `node` or `python` after the image name.

The older *portable* v1.4.2 ZIP still contains the historical Minimus implementation and must be rebuilt separately; this repository commit updates the Codespaces policy, readiness checks, and documentation only. The complete portable commercial IDE has not been synchronized with this PR. Never expose port 4545 publicly or execute arbitrary submitted code without authentication and stronger isolation.
