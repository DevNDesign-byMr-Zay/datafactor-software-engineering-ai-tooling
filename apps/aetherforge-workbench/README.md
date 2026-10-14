# ÆtherForge — Engineering Workbench

**Status:** interactive companion application on an isolated feature branch. No root package or scoring surface is changed.

ÆtherForge provides a user-friendly visual front end for the maintained Software Engineering & AI Tooling library. It is not a new infrastructure-as-code product, deployment controller, or replacement for the library.

## Start (Node.js 22+)

From the repository root:

    node apps/aetherforge-workbench/server.mjs

Open http://127.0.0.1:4545. No npm install, global privileges, Docker daemon, or external credentials are required for this application. For Windows PowerShell:

    node .\apps\aetherforge-workbench\server.mjs

The static HTML also opens directly in a browser, with interactive catalog, navigation, branding, and local file preview. Functions that require Node show **Disconnected** instead of fabricated results.

## Implemented
- Home, real maintained-module catalog, structured search, detail inspector.
- Workflow Studio with authenticated exports: Cloud Run argument **planning only**, Holographic scene **planning only**, and frontend mask normalization.
- Evidence Center for uploading JSON receipts, fingerprint comparison using the existing library, and exporting the resulting verdict.
- Sustainability Lab using real library math for user-supplied energy and duration inputs.
- Asset Studio: previews local image files without uploading them to a server; shows shipped brand assets.
- About/settings, accessible navigation, responsive layouts, reduced motion support, dark/light theme.
- Server binds to 127.0.0.1; request body and route allowlists; no external calls or storage; CSP and no directory traversal.

## Architecture boundary
- All real computation imports only existing maintained exports from ../../src/index.js.
- Source archive and provenance manifests unchanged.
- Root dependencies, package exports, CI thresholds, scored source code and Docker assets unchanged.
- No redeployment or cloud traffic mutation, secret submission, QPU activity, inferred authenticated evidence, or AI model invocation.
- No fabricated health/CI data. Server state means localhost adapter availability only, not GitHub CI status.

## Tests
    node --test apps/aetherforge-workbench/server.test.mjs

Before considering merge also run the unchanged repository quality gates (npm run check, Python tests, audits, fresh clone and Docker verification). Do not merge on faith; the PR is a review checkpoint.

## Source artwork
The three repository SVG assets in assets/ are new lightweight vector derivatives of the supplied AE/AetherForge direction, not pixel-perfect conversions of the submitted raster renders. Original high-resolution boards should be preserved alongside the provided build ZIP; raster references are not required at app runtime.

## Design tokens
Background #081223; surfaces #0D1E3A; Electric Cyan #27D6FF; Forge Blue #3A88FF; Violet Pulse #8A5CFF; Soft Silver #D9E7FF; Slate Steel #5B6E91.
Typography: Orbitron-style geometric display treatment (fallback via system UI), Inter-style humanist body (fallback via system UI).
