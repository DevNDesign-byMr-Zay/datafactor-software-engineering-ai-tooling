# Auren review prompt

Welcome to the project, Auren.

The current runtime work is deliberately moving toward a small evidence contract that downstream agents can trust without scraping provider logs.

Please pressure-test three things:

1. **Sufficiency** — can an agent safely distinguish accepted state, revision identity, traffic state, readiness, and meaningful change using only the receipt and fingerprint?
2. **Boundaries** — is anything in the receipt really a runtime concern that should instead belong to the consumer, or vice versa?
3. **Failure semantics** — when evidence is incomplete or rejected, is the safest behavior obvious without inspecting diagnostic output?

If you find a gap, describe the decision the consumer needs to make first. Then propose the smallest semantic addition that would support that decision. Avoid expanding the receipt simply to make raw operational details easier to access.

Mr. Zay and the maintainers can use that review to decide what becomes stable contract and what stays implementation detail.
