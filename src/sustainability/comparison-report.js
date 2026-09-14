import { createHash } from 'node:crypto';
import { validateSustainabilityComparison } from './receipt-comparison.js';

const REPORT_VERSION = 1;

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

function reportBody(comparison) {
  return {
    version: REPORT_VERSION,
    comparisonFingerprint: comparison.comparisonFingerprint,
    comparability: comparison.sameWorkloadEvidence
      ? 'same-workload-evidence'
      : 'different-workload-evidence',
    contextRequired: comparison.sameWorkloadEvidence !== true,
    observations: [
      {
        metric: 'duration',
        delta: comparison.metrics.durationDeltaMs,
        direction: comparison.metrics.durationDirection,
        unit: 'ms',
        qualification: 'measured-runtime',
      },
      {
        metric: 'estimated-energy',
        delta: comparison.metrics.estimatedEnergyDeltaWh,
        direction: comparison.metrics.estimatedEnergyDirection,
        unit: 'Wh',
        qualification: 'estimated',
      },
      {
        metric: 'renewable-ratio',
        delta: comparison.metrics.renewableRatioDelta,
        direction: comparison.metrics.renewableRatioDirection,
        unit: 'ratio',
        qualification: 'reported-share',
      },
    ],
    interpretation: 'operator-review-required',
    safety: {
      advisoryOnly: true,
      authoritative: false,
      selectsWinner: false,
      recommendsAction: false,
      schedulesWorkloads: false,
      deploysWorkloads: false,
      physicalActuation: false,
    },
  };
}

export function createSustainabilityComparisonReport(comparison) {
  if (!validateSustainabilityComparison(comparison)) {
    throw new TypeError('validated sustainability comparison is required');
  }
  const body = reportBody(comparison);
  return deepFreeze({ ...body, reportFingerprint: fingerprint(body) });
}

export function validateSustainabilityComparisonReport(report, comparison) {
  try {
    if (!validateSustainabilityComparison(comparison)) return false;
    if (!report || typeof report !== 'object' || Array.isArray(report)) return false;
    if (!/^[a-f0-9]{64}$/.test(report.reportFingerprint)) return false;
    const expectedBody = reportBody(comparison);
    const actualBody = Object.fromEntries(
      Object.entries(report).filter(([key]) => key !== 'reportFingerprint'),
    );
    if (JSON.stringify(canonical(actualBody)) !== JSON.stringify(canonical(expectedBody))) return false;
    return report.reportFingerprint === fingerprint(expectedBody);
  } catch {
    return false;
  }
}

export { REPORT_VERSION as SUSTAINABILITY_COMPARISON_REPORT_VERSION };
