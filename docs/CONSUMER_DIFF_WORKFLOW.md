# Consumer diff workflow

A consumer that already has two trusted acceptance receipts can explain a change without inspecting provider diagnostics.

```js
const decision = decideRuntimeAcceptanceChange(currentReceipt, previousFingerprint);

if (decision === 'changed') {
  const changes = diffRuntimeAcceptanceReceipts(previousReceipt, currentReceipt);
  // Consumer policy decides what to do with these facts.
}
```

The useful separation is:

- **decision helper:** determines whether trusted evidence is rejected, unchanged, or changed;
- **diff helper:** explains which trusted fields changed;
- **consumer policy:** decides whether to persist, alert, retry, deploy, rollback, or do nothing.

This keeps explanations useful to agents while preventing the runtime package from becoming an implicit operations controller.
