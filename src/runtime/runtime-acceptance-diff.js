import { serializeRuntimeAcceptanceReceipt } from './runtime-acceptance-receipt.js';

const TRUSTED_FIELDS = Object.freeze([
  ['service', 'name'],
  ['service', 'region'],
  ['service', 'latestReadyRevisionName'],
  ['service', 'traffic'],
  ['service', 'url'],
  ['bootstrap', 'stage'],
  ['bootstrap', 'readiness'],
  ['releaseEvidence', 'stage'],
  ['releaseEvidence', 'exitCode'],
]);

function readPath(value, path) {
  return path.reduce((current, key) => current?.[key], value);
}

function valuesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Explain which trusted receipt facts differ without exposing provider diagnostics.
 */
export function diffRuntimeAcceptanceReceipts(previousReceipt, currentReceipt) {
  if (!previousReceipt || typeof previousReceipt !== 'object' || Array.isArray(previousReceipt)) {
    throw new TypeError('previousReceipt must be an object');
  }
  if (!currentReceipt || typeof currentReceipt !== 'object' || Array.isArray(currentReceipt)) {
    throw new TypeError('currentReceipt must be an object');
  }

  return TRUSTED_FIELDS
    .filter(([section, field]) => !valuesEqual(
      readPath(previousReceipt, [section, field]),
      readPath(currentReceipt, [section, field]),
    ))
    .map(([section, field]) => ({
      field: `${section}.${field}`,
      previous: readPath(previousReceipt, [section, field]),
      current: readPath(currentReceipt, [section, field]),
    }));
}

export function summarizeRuntimeAcceptanceDiff(previousReceipt, currentReceipt) {
  const changes = diffRuntimeAcceptanceReceipts(previousReceipt, currentReceipt);
  return {
    changed: changes.length > 0,
    changeCount: changes.length,
    fields: changes.map(({ field }) => field),
    previousFingerprintInput: serializeRuntimeAcceptanceReceipt(previousReceipt),
    currentFingerprintInput: serializeRuntimeAcceptanceReceipt(currentReceipt),
  };
}
