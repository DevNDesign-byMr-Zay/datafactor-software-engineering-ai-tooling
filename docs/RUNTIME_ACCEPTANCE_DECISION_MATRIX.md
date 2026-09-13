# Runtime acceptance decision matrix

This is the contract-level view for agents and release automation after the receipt fingerprint has been recomputed and verified.

| Input state | Decision | Safe default |
| --- | --- | --- |
| receipt is not an object | invalid input | fail closed |
| `accepted` is not `true` | `rejected` | do not persist as trusted success |
| receipt/fingerprint missing or fingerprint integrity check fails | `rejected` | do not trust or compare the evidence |
| valid accepted receipt + no prior trusted fingerprint | `changed` | treat as the first trusted runtime observation |
| valid accepted receipt + matching prior fingerprint | `unchanged` | no new trusted runtime fact |
| valid accepted receipt + different prior fingerprint | `changed` | inspect receipt and apply consumer policy |

## Important boundary

The decision boundary fingerprints only the sanitized receipt. Provider stdout, stderr, command arguments, and other operational diagnostics are not decision inputs.

A `changed` decision does **not** mean “deploy”, “rollback”, or “alert”. It means the consumer has a new trusted runtime observation: either the first trusted receipt it has seen, or one whose verified fingerprint differs from the previous trusted fingerprint. The consuming system owns the next action.

The absence of a prior fingerprint is not an error and does not require this package to own persistence. A consumer may persist the verified receipt/fingerprint wherever its own architecture requires—or compare them transiently and persist nothing.

That distinction keeps this package useful to different consumers without turning a small evidence primitive into an implicit storage layer or control plane.
