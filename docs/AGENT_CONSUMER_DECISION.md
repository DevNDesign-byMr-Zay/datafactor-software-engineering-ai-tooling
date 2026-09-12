# Agent consumer decision boundary

The maintained runtime surface gives an agent two useful pieces of durable evidence: an accepted receipt and its deterministic fingerprint.

The intended consumer decision is deliberately small:

| Evidence | Consumer interpretation |
| --- | --- |
| `accepted !== true` | `rejected`; do not treat the observation as trusted |
| accepted + fingerprint matches prior trusted fingerprint | `unchanged`; no new runtime fact was observed |
| accepted + fingerprint differs | `changed`; inspect the trusted receipt and apply consumer policy |

The consumer should not derive these states from provider stdout/stderr or deployment command strings. Those remain operational diagnostics.

## Why this boundary matters

This keeps the runtime package from becoming an agent framework or persistence layer. The runtime proves what it can prove. A consumer decides what the evidence means for its own workflow.

If a future consumer cannot safely decide using these facts, the missing semantic should be documented as a concrete contract gap before the receipt is expanded.
