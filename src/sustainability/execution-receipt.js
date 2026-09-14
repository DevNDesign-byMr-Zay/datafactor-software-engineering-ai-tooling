import { createHash } from 'node:crypto';

const RECEIPT_VERSION = 1;

function finiteNonNegative(value, name) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative finite number`);
  }
  return value;
}

function finiteRatio(value, name) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`${name} must be a finite number between 0 and 1`);
  }
  return value;
}

function snapshotEvidence(value, name = 'workload', seen = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${name} numbers must be finite`);
    return value;
  }
  if (!value || typeof value !== 'object') {
    throw new TypeError(`${name} must contain JSON-compatible evidence`);
  }
  if (seen.has(value)) throw new TypeError(`${name} must not contain circular references`);
  seen.add(value);

  if (Array.isArray(value)) {
    const copy = value.map((item, index) =>
      snapshotEvidence(item, `${name}[${index}]`, seen),
    );
    seen.delete(value);
    return copy;
  }

  const copy = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      snapshotEvidence(child, `${name}.${key}`, seen),
    ]),
  );
  seen.delete(value);
  return copy;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function fingerprint(value) {
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)), 'utf8')
    .digest('hex');
}

export function createSustainabilityReceipt({
  workload,
  durationMs,
  estimatedEnergyWh,
  renewableRatio = 0,
}) {
  const body = {
    version: RECEIPT_VERSION,
    workload: deepFreeze(snapshotEvidence(workload)),
    durationMs: finiteNonNegative(durationMs, 'durationMs'),
    estimatedEnergyWh: finiteNonNegative(estimatedEnergyWh, 'estimatedEnergyWh'),
    renewableRatio: finiteRatio(renewableRatio, 'renewableRatio'),
  };

  return deepFreeze({ ...body, receiptFingerprint: fingerprint(body) });
}

export function validateSustainabilityReceipt(receipt) {
  try {
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return false;
    if (receipt.version !== RECEIPT_VERSION) return false;
    if (!/^[a-f0-9]{64}$/.test(receipt.receiptFingerprint)) return false;
    finiteNonNegative(receipt.durationMs, 'durationMs');
    finiteNonNegative(receipt.estimatedEnergyWh, 'estimatedEnergyWh');
    finiteRatio(receipt.renewableRatio, 'renewableRatio');
    snapshotEvidence(receipt.workload);
    const body = Object.fromEntries(
      Object.entries(receipt).filter(([key]) => key !== 'receiptFingerprint'),
    );
    return receipt.receiptFingerprint === fingerprint(body);
  } catch {
    return false;
  }
}

export { RECEIPT_VERSION as SUSTAINABILITY_RECEIPT_VERSION };
