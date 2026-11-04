# Source collection reconciliation

The connected **Software Engineering & AI Tooling** collection was traversed on
November 4, 2026. Its current metadata contains **1,610 files, 40 folders and
1,731,712 bytes**. Every provider file ID, original name and byte length matches
the collection already included in both applications. No item reports a
modification after the October 30 snapshot. There are no missing or extra IDs,
metadata differences or incomplete folder listings.

The machine-readable record is
[`DRIVE_RECONCILIATION_2026-11-04.json`](../provenance/DRIVE_RECONCILIATION_2026-11-04.json).
It preserves each original name, Drive ID, archive path and recorded SHA-256.
Classification identifies 1,317 historical source files, 29 documentation files
and 264 additional files with bytes identical to an earlier entry. Duplicate
entries retain their own identity and original bytes in the archive.

The archive checksum and the individual byte lengths and SHA-256 values of all
1,610 bundled originals were independently checked. The provider metadata
wrapper did not expose requested content-checksum fields. This pass therefore
verifies current metadata and the bundled snapshot's bytes; it does not assert
that every live file was freshly downloaded and hashed.

## Maintained and generated materials

- Canonical maintained derivatives are declared in
  [`config/maintained-surface.json`](../config/maintained-surface.json) and
  [`provenance/PROMOTED_HISTORICAL_ARTIFACTS.json`](../provenance/PROMOTED_HISTORICAL_ARTIFACTS.json).
  Subsequent reviewed fixes belong in these maintained modules. The historical
  originals remain read-only reference material.
- [`apps/aetherforge-corpus/manifest.json`](../apps/aetherforge-corpus/manifest.json)
  is the original-byte inventory. The ZIP and `catalog.browser.js` are generated
  representations of that inventory. Both application packages include them.
- Application assets reside in each application's `assets/` directory. Package
  manifests describe the application files separately from the Drive originals.
- Release evidence, portable application archives and their checksums are
  generated deliverables. The published releases retain their original assets.

No missing maintained source was identified from the current collection
inventory. Importing a historical sample into an editable project remains an
explicit action; displaying it never grants execution or deployment authority.

## Reproduce local integrity checks

```sh
python tools/verify-engineering-corpus.py
node --test tests/aetherforge-corpus.test.mjs
```

To repeat the live comparison, recursively list the source folder through the
connected Drive account, retain complete folder listings, and compare IDs,
original names and sizes with `apps/aetherforge-corpus/manifest.json`. Record any
provider truncation or unreadable items as unresolved. Re-download and hash
changed items before updating the generated ZIP, inventory and browser catalog
together. Never replace the immutable historical release during this process.
