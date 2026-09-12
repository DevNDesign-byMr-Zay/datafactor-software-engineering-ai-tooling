# Consumer integration guide

The runtime acceptance contract is intentionally small. Consumers should treat it as evidence, then apply their own policy.

## Recommended flow

1. Execute runtime acceptance.
2. Build the trusted receipt only after acceptance succeeds.
3. Compute the deterministic fingerprint.
4. Load the consumer's previously trusted fingerprint, if one exists.
5. Call `decideRuntimeAcceptanceChange(receipt, previousFingerprint)`.
6. Persist or act on the result using consumer-owned infrastructure.

## First observation

A missing previous fingerprint is a **changed** observation. It means the consumer has no prior trusted observation to compare against; it does not mean the runtime failed.

## Diagnostics

Provider output, command arguments, stdout, stderr, and similar operational diagnostics are not a substitute for receipt evidence. A consumer that needs those values for a policy decision should first identify the missing semantic and propose a contract change.

## Ownership

The runtime package owns evidence construction and fingerprinting. Consumers own prior-state retrieval, persistence, notification, retries, and downstream action. This separation is intentional so the runtime remains useful across different agent and storage implementations.
