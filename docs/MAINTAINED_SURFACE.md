# Maintained Surface vs Historical Corpus

This repository intentionally contains two different engineering surfaces and does not treat them as interchangeable.

## Maintained surface

The maintained production-facing surface lives under `src/` together with its focused tests under `tests/js/` and `tests/python/`. Selected historical artifacts are promoted into the maintained quality gate only when they are directly exercised by tests or used as an authenticated reference implementation. The holographic maintained surface includes a renderer-neutral capability-negotiation seam that validates an accepted scene handoff against an explicit target capability descriptor, returns advisory compatibility evidence, and never dispatches or actuates a device.

The maintained surface is expected to satisfy blocking CI requirements for linting, formatting, tests, coverage, dependency auditing, and reproducible installation.

## Historical corpus

`Software Engineering & AI Tooling/` preserves deidentified, versioned development history. Repeated and near-duplicate snapshots are retained intentionally because they record implementation progression, debugging, refactoring, and workflow evolution. They are not silently deduplicated or rewritten to improve repository-wide style metrics.

Most historical files are therefore excluded from routine maintained linting and blocking production coverage by design. Historical artifacts enter lint/coverage only when a specific implementation is intentionally promoted with focused tests. Corpus integrity and provenance are verified through the separate import/verification controls rather than a soft-failing pseudo-production lint lane.

## Promotion rule

When historical behavior becomes part of the maintained library surface, the promoted implementation must land with a focused test in the same change. New work should prefer small feature-or-fix commits with the corresponding proving test rather than bulk mixed commits.

## Why the separation matters

The repository is both a software-engineering corpus and a maintained executable reference surface. Preserving the historical sequence protects the value of the corpus, while isolating the maintained surface keeps build, test, lint, and coverage signals meaningful for buyers and maintainers.
