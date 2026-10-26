# Engineering verification and artifact evidence

The **maintained root package** is a developer-tooling/reusable-library project, not a single-purpose backend service. The canonical library entrypoint is `src/index.js`; applications are separately located in `apps/`. See [Project Scope](PROJECT_SCOPE.md) for the maintained/historical boundary and [Maintained Surface](MAINTAINED_SURFACE.md) for provenance rules.

## Reproduce the quality gates

From a clean checkout with Node.js 22+ and Python 3.11+:

```bash
make verify-fresh
docker compose -f docker-compose.yml up --build --abort-on-container-exit --exit-code-from verify
```

The GitHub [engineering CI workflow](../.github/workflows/ci.yml) runs on pull requests and pushes and includes four independent jobs: **JavaScript quality, Python quality, fresh-clone-smoke and container-smoke**. The JS job executes lint, formatting, typecheck (including strict), Jest tests/coverage, and npm audit. The Python job verifies the lockfile, runs pytest/coverage and pip-audit. Separate [CodeQL](../.github/workflows/codeql.yml) runs JS/TypeScript and Python security analysis.

The root `package.json` has **no external JS runtime dependencies by design**, relying on built-in Node APIs; build and test dependencies are under `devDependencies`. The Python runtime uses **FastAPI and Pillow** as declared in `pyproject.toml` and `requirements.txt`, with all transitive and development dependencies pinned in committed `requirements.lock.txt`. Zero direct Node runtime dependencies does **not** imply zero Python runtime dependencies.

## Machine-readable evidence

```bash
node scripts/build-engineering-evidence.mjs --output engineering-evidence.json
```

The generator reads actual repository configuration and aborts if CI commands, lockfile pins, or package classification are inconsistent. A successful `engineering/ci` run uploads the **engineering-evidence** artifact for the exact Git SHA **after all four quality jobs succeed**. Download the artifact from that run to inspect the declared commands and exact pin count.

**Evidence interpretation:** The JSON describes declared checks and paths; it is **not a self-issued pass certificate**. Treat the GitHub job conclusions, test logs and retained coverage artifacts as execution evidence. Automated third-party assessments may categorize repositories differently and may not execute source code.

## ÆtherForge HTTP error observability

The Companion and Commercial server entrypoints use the maintained `src/observability/json-logger.js` and `src/observability/error-reporter.js` through a shared `http-error-tracker.js` adapter. Only **unexpected HTTP 500 failures** are logged; normal, expected 4xx validation refusals are not treated as unhandled exceptions. Logs contain the event type, generated request ID, allowlisted route template, HTTP method and status code. They intentionally omit request bodies, query strings, filesystem paths, exception messages/stacks and provider credentials. Responses retain their generic error contract.

`tests/js/aetherforge-http-error-tracking.test.js` exercises a real failing route in both servers, checks that exactly one structured JSON error entry was emitted and proves untrusted query values are not copied to the log. External error reporting is not automatically activated, and logging does not authorize deployments or customer-data collection.
