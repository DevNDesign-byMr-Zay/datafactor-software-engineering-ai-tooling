import { createHash } from 'node:crypto';
import { validateSustainabilityEvidencePackage } from './evidence-package.js';
import {
  compareSustainabilityReceipts,
  validateSustainabilityComparison,
} from './receipt-comparison.js';

const PACKAGE_COMPARISON_VERSION = 1;

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
    if (!result || typeof result !== 'object' || Array.isArray(result)) return false;
    if (Object.getPrototypeOf(result) !== Object.prototype) return false;
    if (Object.getOwnPropertySymbols(result).length > 0) return false;

    const keys = Object.keys(result).sort();
    const expectedKeys = [
      'baselinePackageFingerprint',
      'candidatePackageFingerprint',
      'comparison',
      'interpretation',
      'packageComparisonFingerprint',
      'safety',
      'version',
    ].sort();
    if (
      keys.length !== expectedKeys.length ||
      keys.some((key, index) => key !== expectedKeys[index])
    ) {
      return false;
    }

    if (result.version !== PACKAGE_COMPARISON_VERSION) return false;
    if (result.interpretation !== 'verified-package-comparison') return false;
    if (!/^[a-f0-9]{64}$/.test(result.packageComparisonFingerprint)) return false;
    if (!validateSustainabilityComparison(result.comparison)) return false;

    const expected = compareSustainabilityEvidencePackages({ baseline, candidate });
    return (
      result.baselinePackageFingerprint === expected.baselinePackageFingerprint &&
      result.candidatePackageFingerprint === expected.candidatePackageFingerprint &&
      JSON.stringify(canonical(result.comparison)) ===
        JSON.stringify(canonical(expected.comparison)) &&
      JSON.stringify(canonical(result.safety)) === JSON.stringify(canonical(expected.safety)) &&
      result.packageComparisonFingerprint === expected.packageComparisonFingerprint
    );
  } catch {
    return false;
  }
}

export { PACKAGE_COMPARISON_VERSION as SUSTAINABILITY_PACKAGE_COMPARISON_VERSION };
