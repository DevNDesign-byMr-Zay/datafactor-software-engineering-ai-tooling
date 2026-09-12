# Runtime acceptance consumer contract

The runtime acceptance path is the **producer** of durable acceptance evidence. It should produce the sanitized `receipt` and its deterministic `receiptFingerprint` only after acceptance succeeds.

## Ownership

- **Producer:** the maintained runtime acceptance flow.
- **Durable consumer:** release automation, an agent workflow, or another system that needs to compare accepted runs.
- **Persistence:** owned by the consuming system. The maintained runtime package does not choose a database, object store, or provider-specific persistence mechanism.
- **Operational diagnostics:** the `release` process evidence remains useful for troubleshooting, but is not the durable acceptance API.

## What downstream automation may trust

For a successful run, downstream automation may persist and compare:

1. `receipt` — the sanitized, versioned acceptance facts.
2. `receiptFingerprint` — the SHA-256 fingerprint of the canonical receipt serialization.
3. `decideRuntimeAcceptanceChange(receipt, previousFingerprint)` — a pure comparison result: `rejected`, `unchanged`, or `changed`.

A consumer should **not** parse `release.stdout`, `release.stderr`, command arguments, environment dumps, or provider-specific diagnostic output to make an acceptance decision.

## Comparison model

The fingerprint is intended for equality checks between canonicalized receipts. Equivalent accepted runs should produce the same fingerprint even when unordered traffic observations arrive in a different order. A changed accepted state, service identity, ready revision, routed traffic, readiness state, or release stage/exit code changes the canonical receipt and therefore its fingerprint.

The decision helper intentionally does not choose a follow-up action. `changed` means trusted evidence differs from the previous trusted observation; it does not mean deploy, rollback, alert, or persist.

The fingerprint is not a signature and does not establish external identity or authorization. Consumers that need those properties must layer them on without changing the receipt contract.

## Failure behavior

Rejected or incomplete acceptance must not produce a durable success receipt. Raw process evidence can remain attached to the operational failure result so engineers can diagnose the failure without contaminating the durable evidence boundary.

## Corpus boundary

This contract applies only to the maintained runtime surface. Historical corpus files are not rewritten, normalized, or repackaged as part of receipt generation or persistence.
