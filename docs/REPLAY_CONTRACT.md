# Replay contract

The replay suite treats each observation as an input to the acceptance decision; it does not mutate trusted state itself.

For a trusted fingerprint `A`:

- accepted `A` with no prior fingerprint → `changed`;
- rejected with prior `A` → `rejected`;
- accepted `B` with prior `A` → `changed`;
- accepted `A` with prior `A` → `unchanged`.

The important invariant is that a rejection has no fingerprint value. A consumer that persists the last trusted fingerprint should therefore retain `A` across the rejection and compare the next accepted receipt against `A`.
