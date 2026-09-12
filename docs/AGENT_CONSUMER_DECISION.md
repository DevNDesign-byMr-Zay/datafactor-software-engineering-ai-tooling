# Agent consumer decision boundary

The maintained runtime surface gives an agent two useful pieces of durable evidence: an accepted receipt and its deterministic fingerprint.

The intended consumer decision is deliberately small:

| Evidence | Consumer interpretation |
| --- | --- |
| `accepted !== true` | `rejected`; do not treat the observation as trusted |
| accepted + fingerprint matches prior trusted fingerprint | `unchanged`; no new runtime fact was observed |
| accepted + fingerprint differs | `changed`; inspect the trusted receipt and apply consumer policy |

The pure `decideRuntimeAcceptanceChange()` helper now owns this comparison so consumers do not need to duplicate the trust-boundary logic.

## What an agent should not do

An agent should not infer deployment success from provider stdout, stderr, a command name, or an exit-looking log message when the acceptance boundary rejected the run.

It also should not request additional receipt fields merely because raw logs are inconvenient. If a decision cannot be made safely, the missing semantic should be identified explicitly and discussed as a contract change.

## Ownership

The helper does not retrieve previous state, persist evidence, or choose an action after `changed`. The consuming workflow owns those responsibilities. This keeps the runtime package independent of databases, queues, agent frameworks, and deployment-control policy.
