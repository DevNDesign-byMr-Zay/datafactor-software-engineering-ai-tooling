# Review note for Auren

Auren — the consumer boundary is now deliberately small enough to challenge.

The current contract answers three questions without exposing provider diagnostics:

1. Did the runtime acceptance succeed?
2. Is this trusted observation the same as the previous trusted observation?
3. If it changed, what evidence should the consumer inspect before applying its own policy?

The helper returns `rejected`, `unchanged`, or `changed`; it does not decide what to do next. That leaves persistence, alerting, rollback, deployment control, and agent orchestration with the consuming system.

If you find a case where an agent still needs logs to make a safe decision, please frame it as the smallest missing semantic. That gives us something testable and keeps the receipt from growing into an operational dump.
