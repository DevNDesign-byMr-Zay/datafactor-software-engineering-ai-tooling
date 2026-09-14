import { createHash } from 'node:crypto';
import { validateSustainabilityReceipt } from './execution-receipt.js';

const OBSERVATION_VERSION = 1;

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
    if (!/^[a-f0-9]{64}$/.test(observation.observationFingerprint)) return false;
    const expectedBody = observationBody(receipt);
    const actualBody = Object.fromEntries(
      Object.entries(observation).filter(([key]) => key !== 'observationFingerprint'),
    );
    if (JSON.stringify(canonical(actualBody)) !== JSON.stringify(canonical(expectedBody))) {
      return false;
    }
    return observation.observationFingerprint === fingerprint(expectedBody);
  } catch {
    return false;
  }
}

export { OBSERVATION_VERSION as SUSTAINABILITY_EFFICIENCY_OBSERVATION_VERSION };
