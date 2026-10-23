# ÆtherForge — Engineering Workbench

> **Current Codespaces guidance (2026-10-23):** Commercial source is committed in PR #211 and served from **private port 4546**; the original companion remains on **private port 4545**. Start both with `bash .devcontainer/start-all.sh`. Use Google Distroless images, **not discontinued Minimus registry tags**. The versioned notes below describe historical portable milestones and should not be treated as current cloud setup instructions. See [README-CLOUD.md](README-CLOUD.md) and [the current cloud runbook](../../docs/AETHERFORGE-COMMERCIAL-CLOUD.md).


**Status:** interactive companion application on an isolated feature branch. No root package or scoring surface is changed.

ÆtherForge provides a user-friendly visual front end for the maintained Software Engineering & AI Tooling library. It is not a new infrastructure-as-code product, deployment controller, or replacement for the library.

## Purpose

ÆtherForge turns the repository from a collection of engineering capabilities into a navigable workbench:

- **Overview / Command Center** — truthful runtime state, capability map, quick actions and local session activity.
- **Module Library** — search, category filters, module detail, canonical export path and workflow readiness.
- **Workflow Studio** — bounded Cloud Run planning, brush geometry and holographic scene planning with structured results.
- **Evidence Center** — receipt loading, fingerprint verification and fail-closed verdicts.
- **Sustainability Lab** — explicit-input energy and workload calculations.
- **Asset Studio** — approved ÆtherForge identity system, six optimized visual references, source registry and local image preview.
- **Engineering Guide** — deterministic repository-aware module matching; no model provider is implied.
- **Settings & About** — appearance, accessibility, runtime/privacy boundaries and repository links.

Desktop uses a persistent workbench rail. Smaller screens switch to a bottom navigation bar and stacked touch-first cards. Dark mode is primary; light mode is supported. Reduced-motion preferences are respected.

## Start (Node.js 22+)

From the repository root:

    node apps/aetherforge-workbench/server.mjs

Open http://127.0.0.1:4545. No npm install, global privileges, Docker daemon, or external credentials are required for this application. For Windows PowerShell:

    node .\apps\aetherforge-workbench\server.mjs

The static HTML and the root `index.html` now both open the full workbench via classic browser scripts. Both support offline Brush/Sustainability reference calculations, clearly labeled as unverified. Cloud/Holographic planning and authoritative receipt checking require the local Node adapter.

## Windows one-click launcher

Double-click `launch-aetherforge.cmd` from the `apps/aetherforge-workbench` directory. It checks for Node.js 22+, starts the local server in a separate command window, waits for the localhost health endpoint, then opens your default browser. If startup fails, the launcher shows recovery guidance and returns an error. Close the server console to stop the service. No administrator privileges or Docker required.

## Portable HTML bundle

This distribution includes the complete user interface at **root `index.html`** and at `apps/aetherforge-workbench/index.html`. Both work in direct-file browser mode with offline navigation, reference artwork and bounded calculations. Server-backed workflows require a local Node.js 22+ runtime.

Regenerate the root HTML and classic browser script from editable sources without installing packages:

    node tools/build-portable.mjs

On Windows, double-click the root `START-AETHERFORGE.cmd` to launch the local server and open the workbench in your browser.

## Implemented

- Home command center with quick actions, capability categories, recent local activity and visible no-regression boundary.
- Real maintained-module catalog with search, category filters, structured detail inspector and source links.
- Workflow Studio with Cloud Run argument **planning only**, Holographic scene **planning only**, and frontend mask normalization.
- Evidence Center for uploading JSON receipts, fingerprint comparison using the existing library, and exporting the resulting verdict.
- Sustainability Lab using real library math for user-supplied energy and duration inputs.
- Asset Studio: previews shipped brand assets; securely stores PNG/JPEG/WebP files in a private localhost-only data directory when connected.
- Engineering Guide with deterministic intent-to-module matching.
- Settings/about, accessible navigation, responsive layouts, reduced motion support, dark/light theme.
- Server binds to 127.0.0.1; request body and route allowlists; no external calls or storage; CSP and no directory traversal.
- `GET /api/workbench/summary` exposes the command-center contract without fabricating CI, cloud, telemetry or AI status.

## Local asset persistence

- PNG, JPEG and WebP up to 6 MiB are accepted only at the loopback server with matching file signatures.
- The private data folder is `apps/aetherforge-workbench/.local-assets/` (Git-ignored). Use `AETHERFORGE_DATA_DIR` for a future custom data directory only after setting an approved local path; the current default is local to the app.
- Assets are indexed by content hash and persist between server restarts. No cloud provider is called and no source repository modification occurs.
- Backup or delete `.local-assets/` explicitly to manage the locally held files. The root library storage API is not replaced.

## Architecture boundary

- All real computation imports only existing maintained exports from ../../src/index.js.
- Source archive and provenance manifests unchanged.
- Root dependencies, package exports, CI thresholds, scored source code and Docker assets unchanged.
- No redeployment or cloud traffic mutation, secret submission, QPU activity, inferred authenticated evidence, or AI model invocation.
- No fabricated health/CI data. Server state means localhost adapter availability only, not GitHub CI status.

## Tests

    node --test apps/aetherforge-workbench/server.test.mjs

The companion CI also syntax-checks the UI, runs the integration tests against maintained exports, and verifies that protected repository surfaces are not changed by this companion branch.

Before considering merge also run the unchanged repository quality gates (npm run check, Python tests, audits, fresh clone and Docker verification). Do not merge on faith; the PR is a review checkpoint.

## Source artwork

The three repository SVG assets in `assets/` are lightweight vector derivatives of the supplied direction. All six user-supplied brand/UI renders are shipped under `assets/references/` as optimized WebP files and display automatically in Asset Studio. The original full-resolution PNGs remain preserved separately in the provided source ZIP; raster reference provenance is recorded in `assets/reference-manifest.json`.

## Design tokens

Background #081223; surfaces #0D1E3A; Electric Cyan #27D6FF; Forge Blue #3A88FF; Violet Pulse #8A5CFF; Soft Silver #D9E7FF; Slate Steel #5B6E91.
Typography: Orbitron-style geometric display treatment (fallback via system UI), Inter-style humanist body (fallback via system UI).

### Source-aware personal Library and sandbox (portable v0.5)

- Source files in the portable archive are indexed into `source-bundle.js` by `tools/build-portable.mjs` with exact content and SHA-256 digests; `SOURCE-INVENTORY.json` describes inventory coverage.
- `library-core.js` is a testable asset classification, normalization, label and filter contract; `library.js` owns browser-local personal asset management. The original `Module Library` continues to document maintained executable exports separately from arbitrary user-uploaded code.
- Personal Library assets support import, category, labels, notes, favorites, editable copies, download, JSON backup, and Drive folder links. No user-added code is executed automatically or promoted into maintained package exports.
- `sandbox-core.js`, `sandbox.js`, `sandbox-frame.html`, `sandbox-frame.js`, and their CSS implement a browser-only three-file code experiment. The isolated frame runs with `sandbox="allow-scripts"` (never `allow-same-origin`); only the frame response permits inline code and explicitly forbids external network requests. No server-side arbitrary code execution endpoints were added.
- Only browser HTML/CSS/JS previews run in the sandbox. Maintained Node/Python modules can be inspected, cloned and exported; they cannot be assumed executable inside the browser frame.
- No Drive OAuth data or private folder IDs are embedded in the distributable ZIP. Drive integration is user-supplied folder shortcuts, not automatic file synchronization.
- The original module actions, server security gates, workflow execution boundaries, and offline math fallback remain intact. Tests in `tests/library-sandbox.test.mjs` check source completeness, file hashes, curation contracts, frame security properties and route serving.

## v0.6 — Commercial asset registry & Engineering IDE

The new **Commercial Asset Library** catalogs the complete public GitHub repository file trees of ROARY's maintained assessment, ROARY.ai, and Canva-App, and provides rights-state, collection, type, SKU, tag and favorite metadata. Public tree metadata is cached in the browser and can be exported/imported offline. Full upstream source is **not** embedded in the portable package; see `../../COMMERCIAL-LIBRARY-SPEC.md`.

The **Engineering IDE** supports validated multi-file source projects, a versioned JSON project model and sandboxed browser preview for HTML/CSS/browser JavaScript. Node/Python/TypeScript source is editable but not executed. An optional Windows `SYNC-UPSTREAM-SOURCES.cmd` mirrored-source action downloads public repos to `upstream-mirror` for read-only local browsing through the Node adapter. No permissions, commercial licenses or checkout purchases are inferred from that mirror.

## One-click Windows start (v0.7)
Extract the complete release package and run `AETHERFORGE.cmd` at the package root. It starts the local server and opens the browser after health verification; optional first-launch portable Node download needs internet. Persistent project workspaces are stored under `%LOCALAPPDATA%\AetherForge`. The isolated Node/Python runner is available only with Docker and an explicit Run action. See `LAUNCH-TROUBLESHOOTING.md`.


## ÆTHERFORGE v0.8 portable workbench additions

The root `AETHERFORGE.cmd` is the recommended single-click Windows launcher; the `.html` entry point cannot start the Node adapter. The app now contains an Operator Profile, accessible Settings controls, cached/paginated Commercial Library, and HTML/CSS/JS browser preview in the Engineering IDE and Code Sandbox. Use **Upload Code Files** in IDE for multiple editable formats including `.html`, `.py`, `.tsx`, `.json`, and `.sql`. Importing files never executes them. See the root `START-HERE.md` and `REPORT.md` for current runtime/verification limits.


## v1.0 — Multi-file execution

Projects saved through the browser IDE may run a selected `.js/.mjs/.cjs` or `.py` entry with eligible local support files inside a manually approved Docker sandbox. This is bounded to 32 files and 64 KiB, no network and no host mounts. Client sends a snapshot, not a filesystem path. `.html` continues to run only in the isolated browser viewport. See `../../START-HERE.md` and `../../examples/` for runnable imports. The `GET /api/diagnostics` endpoint reports safe readiness metadata; all secrets and user code stay out of it.

## Optional Minimus runner v1.2

The portable distribution has an isolated runner whose Node/Python images use supported Minimus production tags, with readiness checks and an explicit setup script. The GitHub feature branch currently contains the shared policy and tests only. Refer to `../../MINIMUS-RUNNER.md` in the full portable package.
