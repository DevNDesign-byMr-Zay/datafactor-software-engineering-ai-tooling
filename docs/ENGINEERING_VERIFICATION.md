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
