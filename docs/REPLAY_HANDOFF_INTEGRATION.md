# Replay handoff integration

This note defines the smallest integration seam between current-evidence verification and replay classification.

1. Verify the current receipt and its supplied fingerprint.
2. Reject malformed, tampered, or unaccepted evidence before comparison.
3. Pass only the verified fingerprint into the replay state layer.
4. Persist a fingerprint only after an accepted observation is classified.
5. Leave rejected evidence unable to overwrite the last trusted fingerprint.

The verifier owns evidence integrity. The replay layer owns temporal comparison. Neither layer owns deployment, rollback, retry, notification, or escalation policy.

## Review handoff

Auren, Mr. Zay, and VÆLON can review this seam independently of the implementation. If the acceptance boundary remains unchanged, prefer adding a focused regression over adding a new runtime abstraction.
