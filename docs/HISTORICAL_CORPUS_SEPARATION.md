# Historical corpus separation contract

## Immutable released baseline

- Release tag: `v1.2.2`
- Release commit: `25bf8b9e36b327b3001f8b12cd0709cf7f1b84ad`
- Release tree: `cf7e5cfa5398cd8739b9bba2c6db5047f88e2231`
- Preservation branch: `archive/historical-corpus-v1.2.2`
- Historical corpus files: **1,610**
- Historical corpus directories: **40**
- Historical corpus bytes: **1,733,733**
- Canonical inventory SHA-256: `cc5592a67d0d68009489b0cc1a6a575f553ff800e7b3d9775c62206d8f863409`

The archive branch points directly at the released commit. The complete released path/blob/size inventory is committed at `provenance/HISTORICAL_CORPUS_V1_2_2_MANIFEST.json`.

## Future application/library tree

The future scored tree may remove the physical `Software Engineering & AI Tooling/` directory only after the six actively maintained historical artifacts are copied byte-for-byte into `src/promoted/`, exports/tests/lint/coverage no longer depend on the archive directory, and CI/security checks pass on the exact proposed head.

No existing release tag or Git history is rewritten.

## Complete offline reference collection

The current Drive originals are also available as inert reference data in [`apps/aetherforge-corpus/`](../apps/aetherforge-corpus/README.md). Both applications and both portable packages include its complete ZIP, per-file inventory and offline viewer. The Commercial Library indexes every original separately. This adds access to the collection without making historical samples part of the maintained runtime or changing the immutable released baseline above.

The 2026-10-30 snapshot preserves 1,610 files and 40 folders, totaling 1,731,712 bytes. Five originals differ from v1.2.2; their old and current byte identities are recorded in the reference manifest. `python tools/verify-engineering-corpus.py` verifies the ZIP, inventory and browser catalog together.

## Recovery

The complete historical corpus remains recoverable from `archive/historical-corpus-v1.2.2`. Each promoted maintained copy retains its original archive path and released Git blob identity in provenance metadata.
