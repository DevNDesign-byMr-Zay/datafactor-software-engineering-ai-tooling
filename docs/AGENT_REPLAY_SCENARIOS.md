# Agent replay scenarios

These scenarios are intentionally provider-neutral. They give an agent a deterministic evidence history to reason over.

| Scenario | Observation sequence | Useful question |
| --- | --- | --- |
| First trust | accepted → no prior fingerprint | What is the first trusted state? |
| Stable | accepted → same receipt | Is there any trusted change to explain? |
| Rollout | accepted revision A → accepted revision B | Which trusted facts changed? |
| Readiness regression | ready → degraded | What semantic evidence changed? |
| Rejection | accepted → rejected → accepted | Should the rejected observation become trusted state? |

The runtime answers evidence questions. The agent or consumer owns the policy question that follows.
