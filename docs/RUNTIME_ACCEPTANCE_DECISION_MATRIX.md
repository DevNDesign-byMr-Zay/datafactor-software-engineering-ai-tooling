# Runtime acceptance decision matrix

This is the contract-level view for agents and release automation.

| Input state | Decision | Safe default |
| --- | --- | --- |
| receipt is not an object | invalid input | fail closed |
| `accepted` is not `true` | `rejected` | do not persist as trusted success |
| accepted receipt + matching prior fingerprint | `unchanged` | no new trusted runtime fact |
| accepted receipt + different prior fingerprint | `changed` | inspect receipt and apply consumer policy |

## Important boundary

The decision helper fingerprints only the sanitized receipt. Provider stdout, stderr, command arguments, and other operational diagnostics are not decision inputs.

A `changed` decision does **not** mean “deploy”, “rollback”, or “alert”. It means the trusted runtime observation differs from the prior trusted observation. The consuming system owns the next action.

That distinction keeps this package useful to different consumers without turning a small evidence primitive into an implicit control plane.
