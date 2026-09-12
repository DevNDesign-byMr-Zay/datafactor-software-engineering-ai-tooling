# Runtime acceptance evidence

The maintained runtime path now has two deliberate boundaries:

1. `executeApplicationRuntimeAcceptance()` proves bootstrap/readiness and collects existing Cloud Run release evidence without deploying or moving traffic.
2. `buildRuntimeAcceptanceReceipt()` converts that result into a compact, stable contract suitable for downstream automation, comparison, or persistence.

## Why the receipt is separate

Runtime command output is useful during a failure, but it is a poor interchange contract. It can contain noisy diagnostics, command arguments, URLs, or environment-specific details that should not become part of a durable artifact.

The receipt keeps only acceptance-relevant facts:

- contract version;
- accepted state;
- service identity and region;
- latest ready revision;
- normalized traffic observations;
- bootstrap/readiness step status;
- release-evidence stage and exit code.

The builder intentionally does **not** copy raw stdout/stderr, command arguments, or arbitrary fields from the underlying execution result.

## Intended use

A caller can persist or compare the receipt while retaining the full runtime result separately for operational debugging. This gives the maintained library a small deterministic evidence surface without pretending that a receipt is itself a deployment mechanism.

The receipt remains fail-closed: an unaccepted execution, incomplete release evidence, or malformed required identity is rejected rather than represented as a successful artifact.
