# ÆTHERFORGE Engineering Reference Library

This directory contains the complete, read-only **Software Engineering & AI Tooling** Drive snapshot verified on 2026-10-30: **1,610 files, 40 folders, 1,731,712 original bytes**.

- `software-engineering-ai-tooling.zip` preserves every original file and its folder path. Extract it to inspect the individual files outside the app.
- `manifest.json` maps every Drive ID and original name to its unique archive path, byte length, SHA-256 and Git blob identity. Duplicate names retain separate Drive IDs in their paths.
- `catalog.browser.js` holds the same bytes as base64 data for offline browsing without a server, OAuth connection or network fetch.
- `index.html` offers search, folder-category filters, pagination, complete plain-text previews, individual downloads and the full ZIP.

Both Commercial and Companion link to this shared library and include it in their portable packages. Commercial also indexes all 1,610 originals alongside the maintained source in its existing Library; choose **Drive original files** in the collection filter.

The samples are reference data. Browsing and downloading do not execute them. Adapting source into an editable project is a separate, explicit action. Maintained code under `src/` is unchanged. Inclusion does not establish commercial licensing rights; review the supplied rights records before reuse.

## Verify and regenerate

From a repository checkout (the developer verifier and tests are not required to run the portable UI):

```sh
python tools/verify-engineering-corpus.py
node --test tests/aetherforge-corpus.test.mjs
```

The verifier checks every ZIP entry, original-byte hash, Drive/path uniqueness, folder count, historical comparison and generated browser catalog. It does not extract or run source samples. After intentionally updating the ZIP and manifest together from a verified Drive inventory, regenerate the browser data with:

```sh
python tools/verify-engineering-corpus.py --rebuild-browser
```

No credentials or temporary download URLs belong in these files. The authenticated Drive fetch transport is not part of the distribution.

## Historical provenance

The immutable `v1.2.2` archive remains at commit `25bf8b9e36b327b3001f8b12cd0709cf7f1b84ad`. Five current Drive files differ from that release: Aster Python v002, Aster JavaScript v638, and the final chat, signed-URL and upload route samples. `manifest.json` records their exact old and current identities. The released archive, original provenance manifest and promoted runtime modules have not been rewritten.
