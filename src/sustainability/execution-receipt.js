import { createHash } from 'node:crypto';

const RECEIPT_VERSION = 1;
const RECEIPT_KEYS = Object.freeze([
  'version',
  'workload',
  'durationMs',
  'estimatedEnergyWh',
  'renewableRatio',
  'receiptFingerprint',
]);

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

function snapshotArray(value, name, seen) {
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${name} must not contain symbol properties`);
  }

  const allowedKeys = new Set(['length']);
  const copy = [];
  for (let index = 0; index < value.length; index += 1) {
    const key = String(index);
    allowedKeys.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) throw new TypeError(`${name} must not contain sparse arrays`);
    if ('get' in descriptor || 'set' in descriptor) {
      throw new TypeError(`${name}[${index}] must not use accessors`);
    }
    copy.push(snapshotEvidence(descriptor.value, `${name}[${index}]`, seen));
  }

  const unexpectedKey = Reflect.ownKeys(value).find(
    (key) => typeof key !== 'string' || !allowedKeys.has(key),
  );
  if (unexpectedKey !== undefined) {
    throw new TypeError(`${name} arrays must not contain extra properties`);
  }

  return copy;
}

function snapshotPlainObject(value, name, seen) {
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${name} must not contain symbol properties`);
  }

  const copy = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!descriptor.enumerable) {
      throw new TypeError(`${name}.${key} must be enumerable evidence`);
    }
    if ('get' in descriptor || 'set' in descriptor) {
      throw new TypeError(`${name}.${key} must not use accessors`);
    }
    copy[key] = snapshotEvidence(descriptor.value, `${name}.${key}`, seen);
  }
  return copy;
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

  let copy;
  if (Array.isArray(value)) {
    copy = snapshotArray(value, name, seen);
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${name} must use plain objects`);
    }
    copy = snapshotPlainObject(value, name, seen);
  }

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

function readReceiptData(receipt) {
  if (Object.getPrototypeOf(receipt) !== Object.prototype) return null;
  if (Object.getOwnPropertySymbols(receipt).length > 0) return null;

  const descriptors = Object.getOwnPropertyDescriptors(receipt);
  const keys = Object.keys(descriptors);
  if (keys.length !== RECEIPT_KEYS.length) return null;
  if (keys.some((key) => !RECEIPT_KEYS.includes(key))) return null;

  const values = {};
  for (const key of RECEIPT_KEYS) {
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || 'get' in descriptor || 'set' in descriptor) {
      return null;
    }
    values[key] = descriptor.value;
  }
  return values;
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
    const data = readReceiptData(receipt);
    if (!data) return false;
    if (data.version !== RECEIPT_VERSION) return false;
    if (
      typeof data.receiptFingerprint !== 'string' ||
      !/^[a-f0-9]{64}$/.test(data.receiptFingerprint)
    ) {
      return false;
    }

    const workload = snapshotEvidence(data.workload);
    const body = {
      version: RECEIPT_VERSION,
      workload,
      durationMs: finiteNonNegative(data.durationMs, 'durationMs'),
      estimatedEnergyWh: finiteNonNegative(data.estimatedEnergyWh, 'estimatedEnergyWh'),
      renewableRatio: finiteRatio(data.renewableRatio, 'renewableRatio'),
    };
    return data.receiptFingerprint === fingerprint(body);
  } catch {
    return false;
  }
}

export { RECEIPT_VERSION as SUSTAINABILITY_RECEIPT_VERSION };
