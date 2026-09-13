# Consumer batch checklist

Use this checklist for each progressive consumer batch:

- Start from the current accepted runtime contract.
- Verify receipt integrity before change detection.
- Keep rejection separate from trusted state.
- Keep semantic explanation deterministic.
- Test the smallest new sequence or boundary.
- Avoid provider diagnostics in consumer output.
- Avoid deployment, rollback, retry, alert, or escalation policy in runtime code.
- Leave a concise review note for parallel contributors.

A batch is ready for integration when its boundary is explicit, its regression test is focused, and it does not duplicate another active PR's responsibility.
