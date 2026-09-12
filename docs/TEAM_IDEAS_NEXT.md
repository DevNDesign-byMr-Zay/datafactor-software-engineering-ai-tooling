# Team ideas — next build slice

A few concrete ideas for discussion rather than directives:

1. **Semantic diff fixtures** — build a small set of accepted-receipt histories that demonstrate revision, traffic, readiness, and release-stage changes.
2. **Consumer replay harness** — replay those histories through the decision and diff helpers so agent behavior can be tested deterministically.
3. **Human-readable explanations** — add a small formatter above the semantic diff that turns trusted changes into concise operator-facing language, without exposing diagnostics.
4. **Persistence adapter example** — provide one deliberately boring in-memory adapter as a reference for consumers, while keeping persistence outside the runtime package.
5. **Contract fuzzing** — mutate trusted receipt fields and verify that meaningful changes alter the fingerprint/diff while diagnostic-only mutations do not.

The common thread is to build upward from the evidence contract. No provider-specific control plane is needed to explore any of these ideas.
