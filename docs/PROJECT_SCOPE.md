# Project Scope

This repository is primarily a **developer-tooling and reusable-library package**. Its complete deidentified historical engineering corpus is preserved outside the scored tree as immutable release provenance.

The maintained executable/library surface is under `src/`, `python_support/`, `tests/js/`, and `scripts/`. Historically sourced behavior participates in the maintained package only through explicit byte-identical copies recorded in the maintained-surface manifest.

## Primary maintained concerns

- reusable application/bootstrap, deployment, runtime-acceptance, sustainability, holographic, auth, API, and observability modules;
- deterministic evidence and verification contracts;
- reproducible JavaScript/Python test, coverage, lint, typecheck, dependency-audit, and container verification;
- provenance-preserving promotion of selected historical artifacts into maintained package exports.

## Classification boundary

The root package is not intended to be scored as a single-purpose backend API service or as infrastructure-as-code. Docker/Compose exist for reproducibility and verification. The historical corpus is preserved at `archive/historical-corpus-v1.2.2` and is intentionally absent from the scored maintained tree.

The root `.repo-class.json`, `config/maintained-surface.json`, and `docs/MAINTAINED_SURFACE.md` jointly define this boundary.
