# Consumer observation flow

The public runtime surface can now be composed into a complete explanation path:

```text
trusted receipt
     ↓
fingerprint comparison
     ↓
rejected / unchanged / changed
     ↓
semantic diff
     ↓
human-readable explanation
     ↓
consumer policy
```

Each step has a narrow responsibility. In particular, the explanation layer reports trusted facts; it does not infer rollback, deployment, retry, or alert behavior.

This composition is useful as a reference for agent consumers because the agent can receive an explicit explanation while the evidence source remains the structured receipt.
