import { createHash } from 'node:crypto';
import { validateSustainabilityReceipt } from './execution-receipt.js';

const COMPARISON_VERSION = 1;

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

function direction(delta) {
  if (delta === 0) return 'unchanged';
  return delta < 0 ? 'lower' : 'higher';
}

function sameWorkloadEvidence(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

export function compareSustainabilityReceipts({ baseline, candidate } = {}) {
  if (!validateSustainabilityReceipt(baseline)) {
    throw new TypeError('baseline sustainability receipt is invalid');
  }
  if (!validateSustainabilityReceipt(candidate)) {
    throw new TypeError('candidate sustainability receipt is invalid');
  }

  const durationDeltaMs = candidate.durationMs - baseline.durationMs;
  const estimatedEnergyDeltaWh = candidate.estimatedEnergyWh - baseline.estimatedEnergyWh;
  const renewableRatioDelta = candidate.renewableRatio - baseline.renewableRatio;

  const body = {
    version: COMPARISON_VERSION,
    baselineFingerprint: baseline.receiptFingerprint,
    candidateFingerprint: candidate.receiptFingerprint,
    sameWorkloadEvidence: sameWorkloadEvidence(baseline.workload, candidate.workload),
    metrics: Object.freeze({
      durationDeltaMs,
      durationDirection: direction(durationDeltaMs),
      estimatedEnergyDeltaWh,
      estimatedEnergyDirection: direction(estimatedEnergyDeltaWh),
      renewableRatioDelta,
      renewableRatioDirection: direction(renewableRatioDelta),
    }),
    interpretation: 'observational-only',
    safety: Object.freeze({
      advisoryOnly: true,
      authoritative: false,
      schedulesWorkloads: false,
      deploysWorkloads: false,
      physicalActuation: false,
    }),
  };

  return Object.freeze({
    ...body,
    comparisonFingerprint: fingerprint(body),
  });
}

export function validateSustainabilityComparison(comparison) {
  try {
    if (!comparison || typeof comparison !== 'object' || Array.isArray(comparison)) return false;
    if (comparison.version !== COMPARISON_VERSION) return false;
    if (!/^[a-f0-9]{64}$/.test(comparison.baselineFingerprint)) return false;
    if (!/^[a-f0-9]{64}$/.test(comparison.candidateFingerprint)) return false;
    if (!/^[a-f0-9]{64}$/.test(comparison.comparisonFingerprint)) return false;
    if (comparison.interpretation !== 'observational-only') return false;
    if (
      comparison.safety?.advisoryOnly !== true
      || comparison.safety?.authoritative !== false
      || comparison.safety?.schedulesWorkloads !== false
      || comparison.safety?.deploysWorkloads !== false
      || comparison.safety?.physicalActuation !== false
    ) {
      return false;
    }
    if (!comparison.metrics || typeof comparison.metrics !== 'object') return false;
    for (const value of [
      comparison.metrics.durationDeltaMs,
      comparison.metrics.estimatedEnergyDeltaWh,
      comparison.metrics.renewableRatioDelta,
    ]) {
      if (!Number.isFinite(value)) return false;
    }
    const body = Object.fromEntries(
      Object.entries(comparison).filter(([key]) => key !== 'comparisonFingerprint'),
    );
    return comparison.comparisonFingerprint === fingerprint(body);
  } catch {
    return false;
  }
}

export { COMPARISON_VERSION as SUSTAINABILITY_COMPARISON_VERSION };
