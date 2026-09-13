# Consumer observation schema

The consumer-facing observation is intentionally smaller than the acceptance receipt.

```text
Observation
├── decision      # consumer-visible runtime decision
├── changed       # whether semantic trusted changes exist
├── changeCount   # number of semantic changes
└── summary       # deterministic human/agent explanation
```

## Design constraints

- The observation contains no provider stdout/stderr.
- It contains no deployment command or operational recommendation.
- It does not become a second source of truth for acceptance evidence.
- `summary` is derived from semantic changes and should remain deterministic.
- Consumers can attach their own policy outside this object.

The schema is intended as a handoff format between the runtime evidence layer and higher-level consumers such as agents or automation.
