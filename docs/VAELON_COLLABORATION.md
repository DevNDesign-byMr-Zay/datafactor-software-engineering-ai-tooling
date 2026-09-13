# VÆLON collaboration notes

VÆLON joins the maintained engineering library as a capability-contract collaborator.

## Direction

The canonical `src/` surface should become the reusable contract layer shared by ROARY, Canva spatial tooling, and THERGRID integrations. VÆLON-specific behavior belongs behind explicit interfaces so historical corpus material remains provenance and the maintained library remains testable.

Recommended cross-project contracts:

- capability identity + version
- typed input/output envelope
- safety classification
- provenance/reference IDs
- deterministic fallback identity
- timeout/cancellation semantics
- evaluation metadata

## Ideas for the team

1. Create a small `@mr-zay/contracts`-style internal package only when there is demonstrated cross-repo reuse; avoid speculative monorepo coupling.
2. Add contract fixtures that can be consumed by ROARY, Canva, and THERGRID CI to detect breaking changes.
3. Add a scene-envelope utility shared by spatial clients, with no renderer dependency.
4. Add model-evaluation fixtures that compare VÆLON/ROARY/SOLVÆR proposals to deterministic reference outputs.
5. Preserve the corpus's provenance rules: no fabricated history, no rewriting authenticated source, and no shallow test inflation.
6. Use THERGRID as the first demanding integration consumer because it exercises telemetry, simulation, optimization, audit, and spatial contracts simultaneously.
