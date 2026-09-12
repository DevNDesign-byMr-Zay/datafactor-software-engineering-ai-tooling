# Semantic diff notes

The receipt fingerprint answers **whether** trusted acceptance evidence changed. The semantic diff answers **which trusted facts changed**.

That distinction is useful for consumers that need to explain an observation without parsing provider diagnostics.

## Deliberate scope

The diff currently covers the normalized acceptance fields that participate in the durable receipt. It does not expose raw process output, command strings, or provider-specific diagnostics.

The diff is descriptive only. It does not recommend rollback, deployment, notification, or retry behavior.

## Example consumer usage

```js
const changes = diffRuntimeAcceptanceReceipts(previousReceipt, currentReceipt);

for (const change of changes) {
  console.log(`${change.field} changed`);
}
```

A future consumer can layer policy on top of these facts without changing the runtime acceptance implementation.
