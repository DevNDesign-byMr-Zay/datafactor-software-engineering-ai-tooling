# Contributing

## Principle

Treat the scored repository tree as a maintained executable library surface. Preserve historical provenance through the immutable archive branch and committed manifests.

## Local workflow

1. Start from a clean checkout of `main`.
2. Run `make setup`.
3. Add or change one focused behavior.
4. Include the regression tests with each behavior change in the same focused commit. Pure prose, formatting and generated-only regeneration do not need artificial tests.
5. Run `make check` before pushing.
6. Keep archive maintenance separate from library changes; archive automation must remain transactional and must never repopulate application/library `main`.

## Commit discipline

Prefer small commits such as:

- `fix: reject invalid duration persistence hooks`
- `test: cover progress cancellation without learning`
- `refactor: share JSON logging configuration`

Avoid combining corpus imports, mass formatting, refactors, and feature changes in one commit. Do not manufacture timestamps, contributors, tags, or synthetic history.

Maintain the project through real, scoped fixes and features over time. A repository's first-to-last commit range does not demonstrate a steady maintenance cadence. The commit-bound `maintenance-evidence.json` CI artifact reports complete author/committer date ranges, active UTC dates, author counts and the most recent 50 commits separately. Its checkout uses full history and explicitly marks any shallow local report as incomplete. Do not rewrite history to change these measurements.

## Quality scope

Historical files remain on the archive branch. When historically sourced behavior becomes actively maintained, copy it into a maintained path, record its archive identity, and add tests before or alongside behavioral changes.

## Security review

Follow `SECURITY.md` for vulnerability reporting. Do not place exploit details, credentials, private identifiers, provider secrets, or raw environment dumps in public issues or durable evidence. Boundary changes should ship with the smallest regression that proves the failure is contained.

## Dependency changes

Update source manifests first. The lockfile workflow resolves and commits `package-lock.json` and `requirements.lock.txt`. Dependabot also proposes weekly npm, pip, and GitHub Actions updates.
