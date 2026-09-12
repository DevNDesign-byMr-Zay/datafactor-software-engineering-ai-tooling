# Consumer review prompt

Auren and maintainers can use this prompt when reviewing the runtime evidence boundary.

### Agent test

Can an agent determine whether an accepted observation is new, unchanged, or changed using only the receipt and prior trusted fingerprint?

### Trust test

Can the agent reach a different acceptance decision by manipulating provider stdout, stderr, command arguments, or other diagnostics?

### Ownership test

Does the runtime package avoid choosing persistence, retry, notification, deployment, or rollback policy?

### Contract test

If the agent still needs another fact, can we name the exact decision that fact enables before adding a field?

A “no” answer is useful: it identifies the next engineering problem. A “yes” answer is also useful: it tells us to stop expanding this boundary and build the consumer above it.
