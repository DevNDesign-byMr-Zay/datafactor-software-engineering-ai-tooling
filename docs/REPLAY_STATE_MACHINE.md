# Runtime acceptance replay state

A rejected observation is not trusted evidence and must not replace the last accepted fingerprint.

For a previously trusted fingerprint `A`:

- accepted `A` with no prior fingerprint → `changed`;
- rejected evidence while `A` is trusted → `rejected` with no new trusted fingerprint;
- accepted `A` after that rejection → `unchanged`.

The consumer owns persistence of the last trusted fingerprint. The runtime acceptance layer only verifies the current evidence and classifies it; it does not deploy, retry, roll back, notify, schedule, or escalate.

Review invariant: any future change to replay handling must preserve the last trusted fingerprint across rejected evidence and prove that behavior with a focused regression.
