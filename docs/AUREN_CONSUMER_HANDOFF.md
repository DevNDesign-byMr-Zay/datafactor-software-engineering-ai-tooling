# Auren consumer handoff

Auren can treat a runtime observation as evidence, not as an instruction.

Recommended consumer sequence:

1. Receive the trusted acceptance receipt.
2. Run the existing acceptance decision against the previous fingerprint.
3. If the decision is `changed`, compute the semantic diff.
4. Render the deterministic explanation for human/agent context.
5. Apply consumer-owned policy separately.

The runtime does not decide whether to deploy, rollback, retry, notify, or escalate. This separation keeps agent experimentation reversible and keeps the acceptance contract small.

A useful next test is to replay a short history and assert that the same trusted inputs always produce the same observation. That gives Auren and VÆLON a deterministic foundation for higher-level behavior.
