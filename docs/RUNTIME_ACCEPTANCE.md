# Runtime acceptance evidence

The maintained runtime path has two deliberate boundaries:

1. `executeApplicationRuntimeAcceptance()` proves bootstrap/readiness and collects existing Cloud Run release evidence without deploying or moving traffic.
2. `buildRuntimeAcceptanceReceipt()` converts that accepted result into a compact, stable contract suitable for downstream automation, comparison, or persistence.

## Ownership and trust model

The runtime acceptance path is the **producer** of durable acceptance evidence. Once acceptance succeeds, the durable interface is the pair:

- `receipt`
- `receiptFingerprint`

A downstream consumer may verify the fingerprint, compare it with a previously trusted fingerprint, and then decide whether accepted evidence is new or unchanged. The runtime library does not own that consumer's database, cache, queue, agent memory, notification policy, or deployment orchestration.

Persistence therefore belongs to the consuming system. Consumers should persist the compact receipt and fingerprint only when their workflow needs durable comparison. A missing previous fingerprint is a valid first-observation state; it does not require this repository to invent a persistence backend.

Raw `release` evidence remains **diagnostic-only**. It can explain how acceptance was evaluated, but downstream automation must not parse command output, stdout/stderr, provider noise, environment dumps, or other operational diagnostics to recover facts already represented by the durable receipt.

Historical corpus files are outside this lifecycle. Runtime acceptance must not rewrite, migrate, or treat historical source material as persistence for current acceptance evidence.

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

The builder intentionally does **not** copy raw stdout/stderr, command arguments, tokens, environment dumps, or arbitrary fields from the underlying execution result.

## Consumer decision boundary

After recomputing and verifying `receiptFingerprint`, a consumer can safely distinguish these states without inspecting operational release evidence:

- no previous trusted fingerprint + valid accepted evidence → `changed`;
- matching previous trusted fingerprint + valid accepted evidence → `unchanged`;
- different previous trusted fingerprint + valid accepted evidence → `changed`;
- missing, malformed, rejected, or fingerprint-mismatched evidence → `rejected`.

This comparison does not authorize a deployment, rollback, traffic change, or provider action. Those decisions remain the responsibility of the downstream system and its own policy/approval boundary.

## Intended use

A caller can persist or compare the receipt while retaining the full runtime result separately for operational debugging. This gives the maintained library a small deterministic evidence surface without pretending that a receipt is itself a deployment mechanism or storage authority.

The receipt remains fail-closed: an unaccepted execution, incomplete release evidence, malformed required identity, or mismatched fingerprint is rejected rather than represented as trusted evidence.
