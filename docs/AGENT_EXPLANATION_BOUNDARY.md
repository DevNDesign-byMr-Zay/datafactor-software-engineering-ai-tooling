# Agent explanation boundary

The runtime can provide three useful layers without becoming an operations controller:

1. **Decision** — rejected, unchanged, or changed.
2. **Diff** — which trusted acceptance facts changed.
3. **Explanation** — concise labels/messages suitable for an agent or operator.

A consumer remains responsible for interpreting those facts and choosing an action.

This is intentionally useful to Auren/VÆLON-style consumers: an agent can explain a trusted change without parsing provider output, while an automation layer can subscribe to the same structured facts without requiring the runtime to own workflows.
