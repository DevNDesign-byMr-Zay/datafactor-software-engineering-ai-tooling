# Project Scope

This repository is primarily a **developer-tooling and reusable-library package** backed by a preserved deidentified software-engineering corpus.

The maintained executable/library surface is under `src/`, `python_support/`, `tests/js/`, and `scripts/`. Historical artifacts under `Software Engineering & AI Tooling/` remain provenance material unless an exact artifact is explicitly promoted into the maintained-surface manifest and blocking quality gates.

## Primary maintained concerns

- reusable application/bootstrap, deployment, runtime-acceptance, sustainability, holographic, auth, API, and observability modules;
- deterministic evidence and verification contracts;
- reproducible JavaScript/Python test, coverage, lint, typecheck, dependency-audit, and container verification;
- provenance-preserving promotion of selected historical artifacts into maintained package exports.

## Classification boundary

The root package is not intended to be scored as a single-purpose backend API service or as infrastructure-as-code. Docker/Compose exist for reproducibility and verification. Historical corpus files are preserved for authenticated engineering provenance and are not equivalent to the maintained library surface.

The root `.repo-class.json`, `config/maintained-surface.json`, and `docs/MAINTAINED_SURFACE.md` jointly define this boundary.
