# Contributing

## Principle

Treat the repository as an engineering corpus with a maintained executable surface. Preserve historical artifacts, but make active changes testable and reproducible.

## Local workflow

1. Start from a clean checkout of `main`.
2. Run `make setup`.
3. Add or change one focused behavior.
4. Add tests that pin the behavior in the same commit whenever practical.
5. Run `make check` before pushing.
6. Keep Drive import/verification separate from product or utility changes.

## Commit discipline

Prefer small commits such as:

- `fix: reject invalid duration persistence hooks`
- `test: cover progress cancellation without learning`
- `refactor: share JSON logging configuration`

Avoid combining corpus imports, mass formatting, refactors, and feature changes in one commit. Do not manufacture timestamps, contributors, tags, or synthetic history.

## Quality scope

Historical files are not bulk-reformatted. When a module becomes actively maintained, add it to the appropriate lint configuration and introduce tests before or alongside behavioral changes.

## Dependency changes

Update source manifests first. The lockfile workflow resolves and commits `package-lock.json` and `requirements.lock.txt`. Dependabot also proposes weekly npm, pip, and GitHub Actions updates.
