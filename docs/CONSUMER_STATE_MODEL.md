# Consumer state model

The runtime contract intentionally stops at evidence comparison. A consumer can build a small state machine around that boundary without making the runtime responsible for persistence or orchestration.

| Prior trusted state | Current runtime result | Consumer state transition |
| --- | --- | --- |
| none | accepted | `new_observation` |
| fingerprint A | same fingerprint A | `unchanged` |
| fingerprint A | fingerprint B | `changed` |
| any | rejected | `rejected` |

`new_observation` is a consumer interpretation of `changed` with no prior fingerprint; it is not a fourth runtime decision.

## Why keep this separate?

Different consumers may handle `changed` differently. One may persist a new record, another may notify an operator, and another may compare additional policy-specific evidence. The runtime should not encode those actions.

The state model also gives Auren a useful agent-level test surface: the agent can reason about trusted evidence without learning provider-specific command syntax or parsing operational logs.
