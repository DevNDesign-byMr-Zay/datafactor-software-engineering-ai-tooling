# Contributor Provenance Log

This log separates authenticated historical behavior from modern maintained-surface promotion. It is intentionally conservative: a historical artifact that came through a shared or otherwise unattributed account is **not** assigned to an individual unless repository or external evidence supports that attribution.

The machine-readable ledger is `provenance/CONTRIBUTOR_PROVENANCE.json`.

For each promoted behavior, the ledger records the stable change ID, scoring category, exact historical source path and blob SHA, canonical maintained destination, historical contributor status, historical GitHub identity when supported, legacy shared-account status, the modern maintained-surface contributor and GitHub identity, attribution basis, confidence, focused tests, and review/verification notes.

## Current promoted cloud workflow

| ID | Maintained behavior | Historical evidence | Historical attribution | Maintained-surface attribution |
| --- | --- | --- | --- | --- |
| CFW-001 | GCS memory upload and object persistence | `upload_route.mjs` blob `ba1134db645eb1d2b98675bec800e0051306c414` | shared-team / individual unresolved | Mr. Zay / `DevNDesign-byMr-Zay` |
| CFW-002 | One-hour signed file access | `sign_route.mjs` blob `ac683ef87c219da88dcf3b8c1c52b4ff72af6da7` | shared-team / individual unresolved | Mr. Zay / `DevNDesign-byMr-Zay` |
| CFW-003 | File-aware Gemini chat with 45-minute signed references | `chat_route.mjs` blob `ed4b46f700988e41c27375a051be6bbec0fd9627` | shared-team / individual unresolved | Mr. Zay / `DevNDesign-byMr-Zay` |

The historical files are preserved in place. The canonical implementation in `src/workflows/cloud-file-workflow.js` is a dependency-injected maintained surface that preserves the tested request/response contracts while making the workflow importable, testable, and reusable without relying on implicit globals.

The maintained-surface attribution identifies who performed the current GitHub promotion. It does **not** retroactively claim that person individually authored the historical route artifact. Future contributors should be recorded on the specific changes they actually make; older shared-team artifacts should only receive individual attribution when evidence supports it.
