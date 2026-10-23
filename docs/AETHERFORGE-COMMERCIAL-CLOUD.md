# ÆTHERFORGE commercial v1.5.0 cloud integration (draft)

This adds a verified import path for the standalone commercial workbench without modifying the existing companion or canonical src module library. PR #211 remains draft. Full source is currently packaged as a separate ZIP, not yet committed to the branch.

## On an iPhone with an existing GitHub Codespace

1. Download AETHERFORGE-Commercial-Codespaces-v1.5.0.zip from the corresponding ChatGPT artifact link into iPhone Files.
2. Upload the ZIP into your Codespace repository root through the VS Code file explorer. Alternatively use GitHub repository **Add file → Upload files**, selecting the *feature branch*, then `git pull --ff-only` in Codespaces.
3. Run the following in the repository root:

```bash
python3 tools/import-aetherforge-commercial.py AETHERFORGE-Commercial-Codespaces-v1.5.0.zip
node --test tests/aetherforge-commercial-cloud.test.mjs
bash .devcontainer/start-commercial.sh
```

4. Open **private port 4546** from the Codespaces Ports tab. The existing companion remains on **private port 4545**. Do not change visibility to Public.

After verification, commit imported apps/aetherforge-commercial and tests/aetherforge-commercial-cloud.test.mjs to PR #211. Do not commit the ZIP as the final distributable source; if it was uploaded through GitHub, remove the ZIP from source control during migration.

The importer pins the ZIP SHA-256 and verifies the manifest digests for every source. It rejects symlinks, path traversal, oversized data and existing target folders. It does not execute imported files. The commercial application has Codespaces hostname allowlisting, same-origin checks, explicit project execution confirmation and Docker-only execution with Google Distroless Node/Python containers. Container calls deny networking, use a read-only root and non-root UID with resource limits, no source-host mounts, no automatic image pull.

Cloud runtime proof from the user: Codespaces Docker Engine and Node/Python Distroless probes both PASS. This does not yet prove the full commercial IDE's cloud Run Project button. That acceptance must be confirmed with the new port 4546 UI and the actual integrated project execution endpoints.

Do not merge this draft PR before the commercial source import, full CI, responsive browser QA, and real Codespaces IDE execution acceptance.
