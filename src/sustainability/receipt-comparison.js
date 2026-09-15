import { createHash } from 'node:crypto';
import { validateSustainabilityReceipt } from './execution-receipt.js';

const COMPARISON_VERSION = 1;
const COMPARISON_KEYS = Object.freeze([
  'version',
  'baselineFingerprint',
  'candidateFingerprint',
  'sameWorkloadEvidence',
  'metrics',
  'interpretation',
  'safety',
  'comparisonFingerprint',
]);
const METRIC_KEYS = Object.freeze([
  'durationDeltaMs',
  'durationDirection',
  'estimatedEnergyDeltaWh',
  'estimatedEnergyDirection',
  'renewableRatioDelta',
  'renewableRatioDirection',
]);
const SAFETY_KEYS = Object.freeze([
  'advisoryOnly',
  'authoritative',
  'schedulesWorkloads',
  'deploysWorkloads',
  'physicalActuation',
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

function direction(delta) {
  if (delta === 0) return 'unchanged';
  return delta < 0 ? 'lower' : 'higher';
}

function sameWorkloadEvidence(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function readExactDataObject(value, expectedKeys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (Object.getPrototypeOf(value) !== Object.prototype) return null;
  if (Object.getOwnPropertySymbols(value).length > 0) return null;

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actualKeys = Object.keys(descriptors).sort();
  const sortedExpected = [...expectedKeys].sort();
  if (
    actualKeys.length !== sortedExpected.length ||
    actualKeys.some((key, index) => key !== sortedExpected[index])
  ) {
    return null;
  }

  const copy = {};
  for (const key of sortedExpected) {
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || 'get' in descriptor || 'set' in descriptor) {
      return null;
    }
    copy[key] = descriptor.value;
  }
  return copy;
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
    const values = readExactDataObject(comparison, COMPARISON_KEYS);
    if (!values) return false;
    if (values.version !== COMPARISON_VERSION) return false;
    if (!/^[a-f0-9]{64}$/.test(values.baselineFingerprint)) return false;
    if (!/^[a-f0-9]{64}$/.test(values.candidateFingerprint)) return false;
    if (!/^[a-f0-9]{64}$/.test(values.comparisonFingerprint)) return false;
    if (typeof values.sameWorkloadEvidence !== 'boolean') return false;
    if (values.interpretation !== 'observational-only') return false;

    const safety = readExactDataObject(values.safety, SAFETY_KEYS);
    if (
      !safety ||
      safety.advisoryOnly !== true ||
      safety.authoritative !== false ||
      safety.schedulesWorkloads !== false ||
      safety.deploysWorkloads !== false ||
      safety.physicalActuation !== false
    ) {
      return false;
    }

    const metrics = readExactDataObject(values.metrics, METRIC_KEYS);
    if (!metrics) return false;
    for (const value of [
      metrics.durationDeltaMs,
      metrics.estimatedEnergyDeltaWh,
      metrics.renewableRatioDelta,
    ]) {
      if (!Number.isFinite(value)) return false;
    }
    if (metrics.durationDirection !== direction(metrics.durationDeltaMs)) return false;
    if (metrics.estimatedEnergyDirection !== direction(metrics.estimatedEnergyDeltaWh))
      return false;
    if (metrics.renewableRatioDirection !== direction(metrics.renewableRatioDelta)) return false;

    const body = {
      version: values.version,
      baselineFingerprint: values.baselineFingerprint,
      candidateFingerprint: values.candidateFingerprint,
      sameWorkloadEvidence: values.sameWorkloadEvidence,
      metrics,
      interpretation: values.interpretation,
      safety,
    };
    return values.comparisonFingerprint === fingerprint(body);
  } catch {
    return false;
  }
}

export { COMPARISON_VERSION as SUSTAINABILITY_COMPARISON_VERSION };
