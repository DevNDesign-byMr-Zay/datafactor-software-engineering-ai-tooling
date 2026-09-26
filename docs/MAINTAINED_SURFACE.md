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
