# ÆtherForge — Engineering Workbench

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

The static HTML also opens directly in a browser, with interactive catalog, navigation, branding, and local file preview. Functions that require Node show **Disconnected** instead of fabricated results.

## Windows one-click launcher

Double-click `launch-aetherforge.cmd` from the `apps/aetherforge-workbench` directory. It checks for Node.js 22+, starts the local server in a separate command window, waits for the localhost health endpoint, then opens your default browser. If startup fails, the launcher shows recovery guidance and returns an error. Close the server console to stop the service. No administrator privileges or Docker required.

## Portable HTML ZIP

Create a portable package outside the repository with:

    node apps/aetherforge-workbench/package-workbench.mjs --output /path/to/aetherforge-workbench

The package has a root `index.html` visual entry point, a copy of the complete workbench under `apps/aetherforge-workbench/`, the required maintained `src/` files, and `START-HERE.md`. The Windows launcher path remains `apps/aetherforge-workbench/launch-aetherforge.cmd`. Node.js 22+ is required; no npm install is needed. Windows CI runs the launcher and browser acceptance checks against this staged package before publishing the `aetherforge-workbench-html-bundle` workflow artifact.

The builder accepts `--preview <png>` to include a verified browser screenshot in the root HTML entry point:

    node apps/aetherforge-workbench/package-workbench.mjs --output /path/to/aetherforge-workbench --preview /path/to/desktop-overview.png

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
