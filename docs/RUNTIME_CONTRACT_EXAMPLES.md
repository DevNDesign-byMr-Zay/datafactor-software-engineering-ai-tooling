# Runtime contract examples

These examples show the intended boundary without prescribing a persistence backend.

## Consumer decision

```js
const receipt = buildRuntimeAcceptanceReceipt(result);
const fingerprint = fingerprintRuntimeAcceptanceReceipt(receipt);

if (receipt.accepted && receipt.releaseEvidence.exitCode === 0) {
  await consumerStore.record({ fingerprint, receipt });
}
```

The consumer owns `consumerStore`. The runtime package does not decide where durable evidence lives.

## Compare-before-action

A consumer can compare fingerprints before treating an observation as new:

```js
const current = fingerprintRuntimeAcceptanceReceipt(receipt);
if (current === previousFingerprint) return { changed: false };
return { changed: true, fingerprint: current };
```

This is intentionally a semantic comparison, not a comparison of provider logs. Equivalent traffic ordering is normalized before fingerprinting, so ordering noise does not manufacture a false change.

## Rejection stays rejection

A rejected runtime acceptance should stop at the boundary. It should not be serialized as if it were a trusted receipt, and a consumer should not infer success from diagnostic output.

The examples are deliberately small: they demonstrate ownership and data flow rather than introducing a storage framework or deployment side effect.
