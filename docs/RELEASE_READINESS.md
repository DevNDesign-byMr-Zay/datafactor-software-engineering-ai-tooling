# Release Readiness

A release-ready commit is not the same thing as a published release. Cut a tag only for a real maintained milestone after the exact candidate commit has passed the blocking quality and security gates.

## Required maintained evidence

`npm run verify:release` checks the repository-level contract that should remain true before a semantic release:

- stable semantic package version and Node 22+ runtime contract;
- committed npm and Python lockfiles;
- explicit maintained/reference surface verification;
- JavaScript type-check, lint, formatting, and enforced coverage;
- npm and Python dependency audits;
- container verification;
- CodeQL for JavaScript/TypeScript and Python;
- explicit package exports for current runtime-acceptance and holographic evidence contracts;
- an unreleased changelog section describing the actual maintained state.

From a clean checkout:

```bash
npm ci --ignore-scripts
npm run verify:release
npm run check
```

The Python and container lanes remain independently enforced by CI. A hosted release or tag should be created only after the exact candidate commit is green; this document does not claim that a release has already been published.

## Boundary rules

Release readiness does not widen execution authority. Sustainability evidence remains descriptive, holographic readiness remains advisory, runtime-acceptance evidence remains a consumer contract rather than deployment authority, and preserved historical snapshots remain provenance material rather than maintained runtime code.

Do not rewrite historical files to improve release metrics. Release notes should describe only behavior that exists on the maintained surface and has executable verification.
