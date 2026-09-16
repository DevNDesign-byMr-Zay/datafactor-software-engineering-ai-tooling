# Runtime acceptance decision matrix

This is the contract-level view for agents and release automation after the current receipt fingerprint has been recomputed and verified.

| Input state | Decision | Safe default |
| --- | --- | --- |
| consumer envelope is not plain data | `rejected` | fail closed |
| current receipt fingerprint is missing or malformed | `rejected` | do not trust or compare current evidence |
| previous fingerprint is supplied but malformed | `rejected` | do not guess change state |
| receipt is not an object or is structurally invalid | `rejected` | fail closed |
| `accepted` is not `true` | `rejected` | do not persist as trusted success |
| supplied current fingerprint does not match the recomputed receipt fingerprint | `rejected` | do not trust current evidence |
| verified accepted receipt + no prior trusted fingerprint | `changed` | treat as the first trusted runtime observation |
| verified accepted receipt + matching prior fingerprint | `unchanged` | no new trusted runtime fact |
| verified accepted receipt + different prior fingerprint | `changed` | inspect receipt and apply consumer policy |

## Verification order

Consumers should validate in one direction only:

1. validate the consumer envelope and fingerprint syntax without evaluating accessors;
2. classify accepted/rejected receipt state through the hardened receipt decision boundary;
3. recompute the current receipt fingerprint from sanitized durable evidence;
4. require the supplied current fingerprint to match that recomputed value;
5. only then compare the verified current fingerprint with any previous trusted fingerprint.

A prior fingerprint must never make malformed or unverified current evidence trustworthy.

## Important boundary

The consumer fingerprints only the sanitized receipt. Provider stdout, stderr, command arguments, environment dumps, tokens, and other operational diagnostics are not decision inputs.

A `changed` decision does **not** mean deploy, rollback, move traffic, retry, notify, or alert. It means the consumer has a new trusted runtime observation: either the first trusted receipt it has seen or one whose verified fingerprint differs from the previous trusted fingerprint. The consuming system owns the next action.

The absence of a prior fingerprint is not an error and does not require this package to own persistence. A consumer may persist the verified receipt/fingerprint wherever its own architecture requires, compare them transiently, or persist nothing.

That distinction keeps this package useful to different consumers without turning a small evidence primitive into an implicit storage layer or control plane.
