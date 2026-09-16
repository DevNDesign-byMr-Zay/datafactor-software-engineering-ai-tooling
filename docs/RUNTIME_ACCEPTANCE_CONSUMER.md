# Verified runtime acceptance consumer

`consumeRuntimeAcceptanceEvidence()` is the maintained boundary for consumers that receive a durable runtime acceptance receipt together with its claimed fingerprint.

The consumer validates the current pair before comparing it with any previously trusted fingerprint. It never treats a prior fingerprint as proof that the current receipt is authentic.

## Inputs

- `receipt`: the sanitized durable runtime acceptance receipt;
- `receiptFingerprint`: the claimed SHA-256 fingerprint for the current receipt;
- `previousFingerprint`: optional previously trusted SHA-256 fingerprint used only for change comparison.

The consumer envelope must be plain enumerable data. Accessors, symbols, inherited/custom prototypes, and unsupported top-level fields fail closed before their values are trusted.

## Result

The function returns a frozen object containing:

- `status`: `changed`, `unchanged`, or `rejected`;
- `fingerprint`: the verified current fingerprint for trusted evidence, otherwise `null`;
- `reason`: `null` for trusted evidence or a compact rejection reason.

A `changed` result is evidence that the verified runtime observation is new relative to the previous trusted fingerprint. It is not permission to deploy, rollback, move traffic, retry, notify, or mutate provider state.

## Rejection behavior

Rejected acceptance is classified without inspecting nested operational release diagnostics. For accepted evidence, the durable receipt is fingerprinted through the strict receipt serializer, so extra provider fields, deceptive descriptors, malformed traffic/readiness evidence, or unsupported receipt structure fail closed.

This module owns verification and comparison only. Persistence and operational policy remain responsibilities of the downstream consumer.
