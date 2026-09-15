import { createHash } from 'node:crypto';
import { validateSustainabilityEvidencePackage } from './evidence-package.js';
import {
  compareSustainabilityReceipts,
  validateSustainabilityComparison,
} from './receipt-comparison.js';

const PACKAGE_COMPARISON_VERSION = 1;
const PACKAGE_COMPARISON_KEYS = Object.freeze([
  'baselinePackageFingerprint',
  'candidatePackageFingerprint',
  'comparison',
  'interpretation',
  'packageComparisonFingerprint',
  'safety',
  'version',
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

function readExactComparisonObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (Object.getPrototypeOf(value) !== Object.prototype) return null;
  if (Object.getOwnPropertySymbols(value).length > 0) return null;

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors).sort();
  const expectedKeys = [...PACKAGE_COMPARISON_KEYS].sort();
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index])
  ) {
    return null;
  }

  const copy = {};
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || 'get' in descriptor || 'set' in descriptor) {
      return null;
    }
    copy[key] = descriptor.value;
  }
  return copy;
}

function exactSafety() {
  return Object.freeze({
    advisoryOnly: true,
    authoritative: false,
    selectsWinner: false,
    recommendsAction: false,
    schedulesWorkloads: false,
    deploysWorkloads: false,
    physicalActuation: false,
  });
}

function body({ baseline, candidate, comparison }) {
  return Object.freeze({
    version: PACKAGE_COMPARISON_VERSION,
    baselinePackageFingerprint: baseline.packageFingerprint,
    candidatePackageFingerprint: candidate.packageFingerprint,
    comparison,
    interpretation: 'verified-package-comparison',
    safety: exactSafety(),
  });
}

export function compareSustainabilityEvidencePackages({ baseline, candidate } = {}) {
  if (!validateSustainabilityEvidencePackage(baseline)) {
    throw new TypeError('validated baseline sustainability package is required');
  }
  if (!validateSustainabilityEvidencePackage(candidate)) {
    throw new TypeError('validated candidate sustainability package is required');
  }

  const comparison = compareSustainabilityReceipts({
    baseline: baseline.receipt,
    candidate: candidate.receipt,
  });
  const comparisonBody = body({ baseline, candidate, comparison });
  return Object.freeze({
    ...comparisonBody,
    packageComparisonFingerprint: fingerprint(comparisonBody),
  });
}

export function validateSustainabilityPackageComparison(result, { baseline, candidate } = {}) {
  try {
    if (!validateSustainabilityEvidencePackage(baseline)) return false;
    if (!validateSustainabilityEvidencePackage(candidate)) return false;

    const values = readExactComparisonObject(result);
    if (!values) return false;
    if (values.version !== PACKAGE_COMPARISON_VERSION) return false;
    if (values.interpretation !== 'verified-package-comparison') return false;
    if (!/^[a-f0-9]{64}$/.test(values.packageComparisonFingerprint)) return false;
    if (!validateSustainabilityComparison(values.comparison)) return false;

    const expected = compareSustainabilityEvidencePackages({ baseline, candidate });
    return (
      values.baselinePackageFingerprint === expected.baselinePackageFingerprint &&
      values.candidatePackageFingerprint === expected.candidatePackageFingerprint &&
      JSON.stringify(canonical(values.comparison)) ===
        JSON.stringify(canonical(expected.comparison)) &&
      JSON.stringify(canonical(values.safety)) === JSON.stringify(canonical(expected.safety)) &&
      values.packageComparisonFingerprint === expected.packageComparisonFingerprint
    );
  } catch {
    return false;
  }
}

export { PACKAGE_COMPARISON_VERSION as SUSTAINABILITY_PACKAGE_COMPARISON_VERSION };
