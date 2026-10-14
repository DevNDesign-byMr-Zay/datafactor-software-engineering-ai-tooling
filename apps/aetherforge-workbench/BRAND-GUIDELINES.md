# ÆtherForge visual language v1

## Identity
- Product: **ÆtherForge — Engineering Workbench**
- Descriptor: Visual development, safe workflow planning, runtime evidence verification, and source-backed developer tools.
- Tagline: **Engineer the Next Possibility.**
- Pillars: clarity, verified engineering, orchestration, modularity and transparent provenance.

## Brand variations
- Logo: assets/aetherforge-logo.svg — horizontal lockup.
- Emblem: assets/aetherforge-emblem.svg — standalone orbit AE interpretation.
- App icon: assets/aetherforge-icon.svg — rounded midnight-blue square with cyan-violet border.

All SVGs are authored vector derivatives of the user-approved reference direction. The supplied raster sources are inventoried in assets/reference-manifest.json with exact checksums and dimensions. The original PNG bytes are not claimed as committed.

## Palette
| Token | Value | Purpose |
|---|---|---|
| Midnight Navy | #081223 | Canvas |
| Deep Space Blue | #0D1E3A | Card surfaces |
| Electric Cyan | #27D6FF | Brand & active interactions |
| Forge Blue | #3A88FF | Navigation, icons |
| Violet Pulse | #8A5CFF | Secondary highlight |
| Soft Silver | #D9E7FF | Primary text |
| Slate Steel | #5B6E91 | Muted metadata |

## Typography
- Geometric futuristic display treatment: Orbitron or similar, if licensed and available.
- UI/body: Inter or comparable sans-serif. The shipped companion intentionally uses built-in system fallbacks and has no font download dependency.
- Preserve high contrast and focus rings at all viewports.

## Interaction and motion
- Reduced-motion users get no orbital animation.
- Cards and controls use subtle ≤200 ms transitions.
- Avoid visual green checks unless produced from actual trusted verification.
- Theme settings persist locally only.

## Source-data language
- Real library computations: show the operation and response as returned.
- Static catalog: label as maintained export descriptions.
- Offline or disconnected adapter: do not show generated results.
- AI assistant: not configured, never present deterministic reference matches as model calls.
- Quantified energy metrics: identify them as user-supplied estimates, never live telemetry.

## Architecture guardrails
- Companion is a separate folder under apps/ and remains review-only until all gates pass.
- Do not modify root package exports, CI thresholds, historical archive, release readiness, Minimus/Docker baseline, or provenance contracts.
- The default UI and local server must not require credentials, external services or Docker.
