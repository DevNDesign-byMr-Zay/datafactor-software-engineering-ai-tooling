# ÆTHERFORGE Commercial Workbench — GitHub Codespaces (v1.5.0-cloud)

This directory is an additive, cloud-adapted copy of the user-tested portable v1.4.2 workbench. The maintained library in `../../src/index.js` remains the authoritative backend. The original `apps/aetherforge-workbench/` companion is unmodified.

Launch with `bash .devcontainer/start-commercial.sh` from the repository root and open **private port 4546** in the Codespaces Ports tab. Never set port 4546 to Public.

The IDE requires deliberate confirmation before Node/Python project execution. Docker uses preloaded Google Distroless Node 22 and Python 3.13 images; no network, no host mounts, read-only image, unprivileged UID, capped CPU/memory/PIDs/output, and execution timeouts. The HTML preview is a separate browser sandbox.

The GitHub Codespaces authenticated port proxy is the access gate, **not the Node process itself**. Do not directly expose this service outside a private Codespace. The allowed remote Host value must exactly match the current Codespace name and port; Origin and Fetch-Site checks remain enforced. Localhost is supported for local smoke tests.

The cloud build does not include private user repositories, SaaS tokens, or generated user projects. Back up workspaces by exporting their source ZIP. Container restarts might clear local filesystem state outside `/workspaces`.
