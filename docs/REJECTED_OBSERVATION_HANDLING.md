# Rejected observation handling

A rejected runtime acceptance result is a state, not a semantic change to trusted acceptance evidence.

Consumers can therefore distinguish:

- `rejected` — the current observation was not accepted;
- `unchanged` — accepted evidence matches the previous fingerprint;
- `changed` — accepted evidence differs from the previous fingerprint.

The consumer observation keeps the rejection state explicit while leaving `changes` empty. Provider diagnostics remain outside the observation and cannot become accidental agent context.

Higher-level consumers can decide what a rejection means for their workflow without requiring the runtime acceptance layer to own retry, rollback, alerting, or escalation policy.
