# Replay state model

For consumers replaying observations, rejection is deliberately not a replacement for the last trusted fingerprint.

```text
accepted(A) ──same trusted evidence──> unchanged
     │
     └──trusted evidence differs─────> changed
     │
     └──rejected observation─────────> rejected
                                          │
                                          └──next accepted(A) -> unchanged
```

This keeps a failed observation from erasing the last known trusted state. Consumers can layer their own policy on top of the resulting decision without changing the acceptance contract.
