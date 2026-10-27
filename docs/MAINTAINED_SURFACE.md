# Maintained Surface and Historical Archive

This repository's scored tree is a maintained developer-tooling/reusable-library package.

## Maintained surface

The active engineering surface lives under:

- `src/`
- `python_support/`
- `tests/js/`
- `tests/python/`
- `scripts/`

Seven historically sourced artifacts remain under active quality gates as provenance-bound maintained copies. Four remain byte-identical; three route modules contain only a relocation-required relative-import rewrite so they can resolve `src/api/route-safety.js` from their maintained location. Six live under `src/promoted/`; one Python utility lives at `python_support/aster_python_v002.py`.

Each maintained copy records its original released archive path and archive Git blob identity plus its maintained Git blob identity and allowed transformation in `config/maintained-surface.json` and `provenance/PROMOTED_HISTORICAL_ARTIFACTS.json`.

## Historical archive

The complete historical engineering corpus is intentionally external to the scored maintained tree.

- Release: `v1.2.2`
- Release commit: `25bf8b9e36b327b3001f8b12cd0709cf7f1b84ad`
- Archive branch: `archive/historical-corpus-v1.2.2`
- Historical files: **1,610**
- Historical directories: **40**
- Historical bytes: **1,733,733**
- Inventory SHA-256: `cc5592a67d0d68009489b0cc1a6a575f553ff800e7b3d9775c62206d8f863409`

The complete released path/blob/size inventory is committed at `provenance/HISTORICAL_CORPUS_V1_2_2_MANIFEST.json`.

## Boundary enforcement

`npm run verify:surface` fails if:

- the physical historical corpus appears in the scored tree;
- the archive release/tag/tree/count/digest contract drifts;
- the full manifest stops listing all 1,610 released files;
- a promoted maintained copy no longer matches its released Git blob identity.

The ordinary lint, formatting, JavaScript/Python tests, coverage, typechecking, package exports, and container checks operate without the archive directory.

## Promotion rule

Historically sourced behavior enters the maintained package only as an explicit maintained copy with:

1. a recorded original archive path and content identity;
2. focused tests;
3. maintained lint/coverage/type boundaries where applicable; and
4. normal pull-request CI and security review.

No historical snapshot becomes maintained code merely because it exists in the archive.

## Structured logging and error reporting

Maintained Node modules use `getLogger` from `src/observability/json-logger.js` instead of direct `console` calls; ESLint enforces this across `src/**/*.js` and `src/**/*.mjs`. The logger writes one JSON record per line with a trusted timestamp, severity, logger name, and bounded message. Metadata cannot override those envelope fields. Primitive metadata strings are limited to 256 characters; nested objects are omitted. Consumers must provide only non-sensitive diagnostic fields: this bound is not a general secret-redaction mechanism.

`src/api/route-safety.js` uses the shared logger by default for route failures. Its versioned failure schema excludes raw upstream messages/stacks and limits context before emitting a record. `tests/js/route-safety.test.js` launches the default route path in a clean Node subprocess and parses its actual stdout, proving exactly one structured failure record is produced without private error details or nested context. Injected loggers remain supported for host integration.

`src/observability/error-reporter.js` provides an optional capture adapter. The default adapter makes no external calls. A consumer may supply a capture function; it receives the error and bounded primitive context and must apply its own consent, redaction, and transport policy. Reporter failures are isolated and logged without their raw message. The Companion and Commercial HTTP adapters supply only allowlisted route, request ID, method and status metadata for unexpected 500 responses; real HTTP regression tests cover both entrypoints.
