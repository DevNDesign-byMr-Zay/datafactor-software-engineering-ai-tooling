# Consumer boundary checklist

Before extending the runtime acceptance consumer surface, check:

- Does the change consume the sanitized receipt rather than provider output?
- Can the result be reproduced from the same trusted inputs?
- Is the output descriptive rather than an operational command?
- Does the addition avoid expanding the trusted receipt schema?
- Can a consumer own deployment, rollback, retry, notification, or escalation policy independently?
- Is there a focused test that demonstrates the boundary?

If a proposed feature fails one of these checks, discuss the boundary before adding another runtime abstraction.
