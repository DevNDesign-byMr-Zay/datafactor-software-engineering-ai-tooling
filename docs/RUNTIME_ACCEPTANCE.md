# Runtime acceptance evidence

The maintained runtime path has three deliberate boundaries:

1. `executeApplicationRuntimeAcceptance()` proves bootstrap/readiness and collects existing Cloud Run release evidence without deploying or moving traffic.
2. `buildRuntimeAcceptanceReceipt()` converts an accepted result into a compact, stable contract suitable for downstream automation, comparison, or persistence.
3. `consumeRuntimeAcceptanceEvidence()` verifies the durable `receipt + receiptFingerprint` pair before classifying the current trusted observation as changed or unchanged.

## Ownership and trust model

The runtime acceptance path is the producer of durable acceptance evidence. Once acceptance succeeds, the durable interface is the pair:

- `receipt`
- `receiptFingerprint`

The consumer boundary validates the current pair before comparison. A supplied current fingerprint never becomes trustworthy merely because it matches a previously stored value, and a previous fingerprint is comparison input only.

Persistence belongs to the consuming system. This package does not own the caller's database, cache, queue, agent memory, notification policy, deployment orchestration, or rollback policy. A missing previous fingerprint is a valid first-observation state and does not require this repository to invent a persistence backend.

Raw release evidence remains diagnostic-only. It can explain how acceptance was evaluated, but downstream automation must not parse stdout/stderr, commands, arguments, tokens, environment dumps, or other provider noise to recover facts already represented by the durable receipt.

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

The builder intentionally does **not** copy raw stdout/stderr, command arguments, tokens, environment dumps, or arbitrary provider fields from the underlying execution result.

## Consumer decision boundary

After the current receipt/fingerprint pair verifies, a consumer can safely distinguish these states without inspecting operational release evidence:

- no previous trusted fingerprint + verified accepted evidence → `changed`;
- matching previous trusted fingerprint + verified accepted evidence → `unchanged`;
- different previous trusted fingerprint + verified accepted evidence → `changed`;
- rejected acceptance, malformed evidence, invalid comparison input, or fingerprint mismatch → `rejected`.

A `changed` result means only that the consumer has a new trusted runtime observation. It does **not** mean deploy, rollback, move traffic, alert, retry, or mutate provider state. Those actions remain behind the downstream system's own policy and approval boundary.

## Intended use

A caller can persist or compare the verified receipt and fingerprint while retaining the full runtime result separately for operational debugging. This gives the maintained library a deterministic evidence surface without turning the receipt or consumer helper into a storage authority or control plane.

The receipt and consumer boundary remain fail-closed: unaccepted execution, incomplete release evidence, malformed identity, deceptive descriptors, unsupported fields, or fingerprint mismatch are rejected rather than represented as trusted success.
