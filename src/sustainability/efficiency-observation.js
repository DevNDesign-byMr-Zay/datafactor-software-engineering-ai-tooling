import { createHash } from 'node:crypto';
import { validateSustainabilityReceipt } from './execution-receipt.js';

const OBSERVATION_VERSION = 1;
const OBSERVATION_KEYS = Object.freeze([
  'version',
  'sourceReceiptFingerprint',
  'metrics',
  'interpretation',
  'safety',
  'observationFingerprint',
]);

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

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function snapshotObservationEvidence(value, path = 'observation', seen = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${path} numbers must be finite`);
    return value;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${path} must contain plain JSON-compatible evidence`);
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${path} must use plain objects`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${path} must not contain symbol properties`);
  }
  if (seen.has(value)) throw new TypeError(`${path} must not contain circular references`);
  seen.add(value);

  const copy = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!descriptor.enumerable) {
      throw new TypeError(`${path}.${key} must be enumerable evidence`);
    }
    if ('get' in descriptor || 'set' in descriptor) {
      throw new TypeError(`${path}.${key} must not use accessors`);
    }
    copy[key] = snapshotObservationEvidence(descriptor.value, `${path}.${key}`, seen);
  }

  seen.delete(value);
  return copy;
}

function observationBody(receipt) {
  if (!validateSustainabilityReceipt(receipt)) {
    throw new TypeError('validated sustainability receipt is required');
  }
  if (receipt.durationMs === 0 && receipt.estimatedEnergyWh > 0) {
    throw new TypeError('average power cannot be derived from non-zero energy over zero duration');
  }

  const durationHours = receipt.durationMs / 3_600_000;
  const averagePowerWatts = durationHours === 0 ? 0 : receipt.estimatedEnergyWh / durationHours;
  const estimatedNonRenewableShareEnergyWh =
    receipt.estimatedEnergyWh * (1 - receipt.renewableRatio);

  return {
    version: OBSERVATION_VERSION,
    sourceReceiptFingerprint: receipt.receiptFingerprint,
    metrics: {
      averagePower: {
        value: averagePowerWatts,
        unit: 'W',
        qualification: 'derived-from-estimated-energy-and-measured-duration',
      },
      estimatedNonRenewableShareEnergy: {
        value: estimatedNonRenewableShareEnergyWh,
        unit: 'Wh',
        qualification: 'derived-from-estimated-energy-and-reported-renewable-ratio',
      },
    },
    interpretation: 'observational-only',
    safety: {
      advisoryOnly: true,
      authoritative: false,
      ranksWorkloads: false,
      recommendsAction: false,
      schedulesWorkloads: false,
      deploysWorkloads: false,
      physicalActuation: false,
    },
  };
}

export function createSustainabilityEfficiencyObservation(receipt) {
  const body = observationBody(receipt);
  return deepFreeze({
    ...body,
    observationFingerprint: fingerprint(body),
  });
}

export function validateSustainabilityEfficiencyObservation(observation, receipt) {
  try {
    if (!observation || typeof observation !== 'object' || Array.isArray(observation)) return false;
    const normalized = snapshotObservationEvidence(observation);
    const keys = Object.keys(normalized);
    if (keys.length !== OBSERVATION_KEYS.length) return false;
    if (keys.some((key) => !OBSERVATION_KEYS.includes(key))) return false;
    if (!/^[a-f0-9]{64}$/.test(normalized.observationFingerprint)) return false;

    const expectedBody = observationBody(receipt);
    const { observationFingerprint, ...actualBody } = normalized;
    if (JSON.stringify(canonical(actualBody)) !== JSON.stringify(canonical(expectedBody))) {
      return false;
    }
    return observationFingerprint === fingerprint(expectedBody);
  } catch {
    return false;
  }
}

export { OBSERVATION_VERSION as SUSTAINABILITY_EFFICIENCY_OBSERVATION_VERSION };
