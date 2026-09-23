# Release Readiness

Before creating a semantic release from this repository:

1. Start from the exact intended `main` commit.
2. Run the documented fresh-clone setup from `README.md`.
3. Confirm `npm run check` succeeds.
4. Confirm the locked Python install and Python test/lint commands used by CI succeed.
5. Confirm the container verification job succeeds.
6. Confirm dependency audits and CodeQL are green.
7. Confirm `docs/MAINTAINED_SURFACE.md` still matches the actual exported `src/` surface and promoted historical artifacts.
8. Review `RELEASE_NOTES.md` so it describes only behavior that actually exists on the release commit.

Release readiness does not widen execution authority: sustainability evidence remains descriptive, holographic readiness remains advisory, and preserved historical snapshots remain provenance material rather than maintained runtime code.
