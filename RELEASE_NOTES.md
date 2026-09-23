# Current Release Notes

## Unreleased — maintained current-main milestone

This note describes the maintained executable surface as it exists on current `main`. It is not a claim that a Git tag or hosted release has already been created.

### Maintained runtime and API boundaries

- JavaScript and Python installs are reproducible from committed lockfiles.
- The maintained JavaScript surface lives under `src/` with focused tests under `tests/js/`; Python verification/maintenance code has its own locked quality lane.
- HTTP-facing promoted reference routes are schema/contract tested for malformed input and rejection behavior.
- Structured logging and runtime evidence remain separate from the preserved historical corpus.

### Holographic maintained surface

The current renderer-neutral stack now includes:

- deterministic scene planning with provenance-bound evidence;
- defensive nested `constraints` and `animation` capture;
- validated scene handoff with immutable provenance/safety commitments;
- capability negotiation bound to accepted scene identity;
- renderer-neutral interaction normalization;
- deterministic multi-device readiness evidence.

These components are advisory only. They do not select a device, dispatch a renderer, access a camera/browser, persist runtime authority, schedule deployment, auto-apply changes, or physically actuate hardware.

### Reproducibility and quality

Current CI verifies:

- reproducible dependency installation;
- dependency audits;
- JavaScript lint + formatting;
- JavaScript tests with enforced coverage;
- Python lint/tests with enforced coverage;
- containerized maintained checks;
- CodeQL static analysis; and
- maintained/historical surface separation.

### Historical corpus

`Software Engineering & AI Tooling/` remains preserved development/reference material. Exact promoted artifacts enter maintained lint/coverage only when paired with focused tests. The broader corpus is not bulk-rewritten or presented as homogeneous production code.

### Release discipline

A semantic tag should be created only for a real maintained milestone after the exact target commit is green in engineering CI and CodeQL. Do not manufacture or backdate tags to simulate elapsed history.
