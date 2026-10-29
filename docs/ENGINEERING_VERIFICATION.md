# Engineering verification and artifact evidence

The **maintained root package** is a developer-tooling/reusable-library project, not a single-purpose backend service. The canonical library entrypoint is `src/index.js`; applications are separately located in `apps/`. See [Project Scope](PROJECT_SCOPE.md) for the maintained/historical boundary and [Maintained Surface](MAINTAINED_SURFACE.md) for provenance rules.

## Reproduce the quality gates

From a clean checkout with Node.js 22+ and Python 3.11+:

```bash
make verify-fresh
docker compose -f docker-compose.yml up --build --abort-on-container-exit --exit-code-from verify
```

The GitHub [engineering CI workflow](../.github/workflows/ci.yml) runs on pull requests and pushes and includes four independent jobs: **JavaScript quality, Python quality, fresh-clone-smoke and container-smoke**. The JS job executes lint, formatting, typecheck (including strict), Jest tests/coverage, and npm audit. The Python job verifies the lockfile, runs pytest/coverage and pip-audit. Separate [CodeQL](../.github/workflows/codeql.yml) runs JS/TypeScript and Python security analysis.

The root `package.json` has **no external JS runtime dependencies by design**, relying on built-in Node APIs; build and test dependencies are under `devDependencies`. The Python runtime uses **FastAPI and Pillow** as declared in `pyproject.toml` and `requirements.in`, with all transitive and development dependencies pinned in both `requirements.txt` (conventional pip/scanner entrypoint) and `requirements.lock.txt` (legacy provenance/CI contract). The two pinned snapshots are checked for exact parity. Zero direct Node runtime dependencies does **not** imply zero Python runtime dependencies.

## Machine-readable evidence

```bash
node scripts/build-engineering-evidence.mjs --output engineering-evidence.json
```

The generator reads actual repository configuration and aborts if CI commands, lockfile pins, or package classification are inconsistent. A successful `engineering/ci` run uploads the **engineering-evidence** artifact for the exact Git SHA **after all four quality jobs succeed**. Download the artifact from that run to inspect the declared commands and exact pin count.

**Evidence interpretation:** The declared-contract JSON describes configured checks and paths; it is **not a self-issued pass certificate**. Treat the GitHub job conclusions, test logs and retained coverage artifacts as execution evidence. Automated third-party assessments may categorize repositories differently and may not execute source code.

The same completed `engineering-evidence-<SHA>` artifact now includes `ci-gate-results.json`. This separate outcome receipt projects the actual `needs` conclusions supplied by GitHub Actions for the **JavaScript, Python, fresh-clone and container jobs**. It binds those four success results to the exact 40-character commit SHA and numeric workflow run ID, fails closed on missing, extra, skipped or failed prerequisites, and discards all untrusted job outputs. It is emitted only by the dependent evidence job after all four required jobs pass; CodeQL is independently checked in the `security/codeql` workflow, not falsely included as a `needs` result.

To independently verify a receipt, open its `engineering/ci` run ID in GitHub Actions, compare the SHA to the commit under review, and inspect each required job's actual conclusion. This receipt is a **minimal projection of GitHub's execution state**, not a cryptographic attestation, proof that CodeQL passed, or an independent scoring certificate. No AI agents or automated execution authority are introduced.

## ÆtherForge Evidence Center single-source contract

The authored Evidence Center implementation is `apps/aetherforge-workbench/evidence-center.js`. The Commercial ESM entrypoint re-exports its five public functions; the self-contained Commercial classic-browser asset is a generated derivative. The generated classic asset preserves the Commercial-only fail-closed `file://` guard, so local receipt verification still requires its localhost adapter. This refactor changes no receipt acceptance or deployment authority semantics.

When editing the canonical source, regenerate the browser file and module wrapper, then verify exact parity:

```bash
node scripts/sync-evidence-center.mjs --write
npm run verify:evidence-center
npm test
```

The default generator mode and the `engineering/ci` JavaScript job both run the read-only parity check. The Commercial source package includes both workbench and commercial application directories. Do not hand-edit `evidence-center.browser.js`; review the generated diff and existing browser/Node tests as part of the PR.

## ÆtherForge HTTP error observability

The Companion and Commercial server entrypoints use the maintained `src/observability/json-logger.js` and `src/observability/error-reporter.js` through the packaged `apps/aetherforge-workbench/http-error-tracker.js` adapter. Only **unexpected HTTP 500 failures** are logged; normal, expected 4xx validation refusals are not treated as unhandled exceptions. Logs contain the event type, generated request ID, allowlisted route template, HTTP method and status code. They intentionally omit request bodies, query strings, filesystem paths, exception messages/stacks and provider credentials. Responses retain their generic error contract.

`tests/js/aetherforge-http-error-tracking.test.js` exercises a real failing route in both servers, checks that exactly one structured JSON error entry was emitted and proves untrusted query values are not copied to the log. External error reporting is not automatically activated, and logging does not authorize deployments or customer-data collection.

## Installed dependency accounting

The root JavaScript production manifest declares **0 external runtime packages**; its four development dependencies provide lint, formatting, tests and typechecking. Python declares **2 direct runtime requirements**, FastAPI and Pillow, in `pyproject.toml` and `requirements.in`. Python lock snapshots additionally resolve development/audit tools and transitive dependencies. These are separate language boundaries.

CI records the actual installed graph for its tested commit:

- The separate `node-production-dependencies-<SHA>` artifact includes `node-runtime-dependencies.json`, produced by `npm ls --omit=dev --depth=0 --json`.
- The separate `python-installed-dependencies-<SHA>` artifact includes `python-installed-dependencies.json` and `python-top-level-dependencies.json`, produced by `python -m pip list --format=json` and `python -m pip list --not-required --format=json`.

The latter lists installed packages with no installed reverse dependency; it includes development tools and must not be interpreted as the declared runtime set. Compare the inventories to the manifests and pinned snapshots. `npm ci` installs the existing npm lock without regenerating it; the refresh workflow resolves updates and commits both exact Python snapshots together. CI verifies declaration/lock parity and `pip check` before tests.

## External dependencies and disconnected verification

A clean machine needs the following public downloads. No Google/Drive credentials or live AI provider calls are required for root library verification.

| Phase | Network requirement |
| --- | --- |
| npm installation and audit | npm registry tarballs and advisory metadata |
| Python installation and audit | PyPI, package files on files.pythonhosted.org and vulnerability metadata |
| Verification image build | Public Node image from Docker Hub and Debian apt repositories, followed by npm/PyPI installation |
| Commercial isolated-runtime smoke probes | Approved public gcr.io/distroless images, preloaded before execution |
| GitHub-hosted CI and CodeQL setup | GitHub Actions tooling, runner images and CodeQL downloads |

The Commercial Cloud CI workflow caches a compressed `docker save` archive of the approved Node/Python images. Its key binds the runner OS, UTC date, sandbox policy and workflow content. A cache hit loads the archive locally without a registry pull. A miss downloads and saves the images; daily keys allow image security refreshes. CI records the loaded RepoDigests. Cache availability is an optimization, not a promise of first-run offline installation. Isolated projects retain `--pull=never` and their existing network-disabled, unprivileged sandbox policy.

Root container CI first runs the complete online `make check`, including dependency audits, then executes a fresh container with all external networking disabled:

```bash
docker build --tag maintained-offline-check .
docker run --rm --network none maintained-offline-check make verify-offline
```

`verify-offline` reuses the installed pinned dependencies and runs surface/lock checks, ordinary and strict typechecking, ESLint/ruff, formatting, Jest/Python coverage, release readiness and generated Evidence Center parity. It intentionally does not download packages or query live vulnerability databases. The independent online audit gates remain mandatory. An exit code of zero from the network-disabled container is the execution evidence; merely adding this command to a workflow does not prove it passed.

## Input validation boundaries

The Companion and Commercial HTTP servers validate requests before invoking maintained library operations. These guards are hand-written, fail-closed checks; a missing third-party validation framework is not evidence that a route accepts unchecked input.

| Boundary | Guard and rejection contract |
| --- | --- |
| Host and browser origin | Both entrypoints require a loopback host or the explicitly configured private Codespaces host, compare browser Origin with allowed origins, and reject cross-site fetches with HTTP 403. |
| POST /api/run content type | The media type must be application/json (parameters are allowed); other media types receive HTTP 415. |
| POST /api/run body size | Count raw incoming bytes before accumulating chunks. Exactly 65,536 bytes is allowed; a larger body receives HTTP 413 before JSON or domain evaluation. Decode the bounded concatenated buffer once. |
| POST /api/run JSON shape | Malformed JSON, null, arrays, missing/non-object inputs and unsupported actions receive the bounded HTTP 422 validation response. |
| POST /api/run domain inputs | The allowlisted workflow dispatch calls the maintained brush, deployment-planning, scene-planning, efficiency or receipt-validation functions. Their domain guards remain authoritative; planning does not grant execution or deployment authority. |

The regression suite in tests/js/aetherforge-http-byte-limit.test.js starts each real server on an ephemeral loopback port. It checks an oversized multibyte payload, exact-limit acceptance with a valid brush calculation, one-byte-over rejection, malformed/non-object JSON, unsupported actions, media type, Origin and Sec-Fetch-Site. It consumes each response and closes every server. Tests make no live provider or deployment calls. The default HTTP 500 reporting pipeline is separately exercised by tests/js/aetherforge-http-error-tracking.test.js; expected 4xx validation refusals are not reported as unexpected server errors.
