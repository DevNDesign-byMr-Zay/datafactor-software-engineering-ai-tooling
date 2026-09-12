import { fingerprintRuntimeAcceptanceReceipt } from './runtime-acceptance-receipt.js';

const DECISIONS = Object.freeze({
  REJECTED: 'rejected',
  UNCHANGED: 'unchanged',
  CHANGED: 'changed',
});

/**
 * Resolve the smallest useful consumer decision from trusted runtime evidence.
 * Provider diagnostics never participate in this decision.
 */
export function decideRuntimeAcceptanceChange(receipt, previousFingerprint) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    throw new TypeError('receipt must be an object');
  }

  if (receipt.accepted !== true) return DECISIONS.REJECTED;

  const currentFingerprint = fingerprintRuntimeAcceptanceReceipt(receipt);
  return currentFingerprint === previousFingerprint ? DECISIONS.UNCHANGED : DECISIONS.CHANGED;
}

export { DECISIONS as RUNTIME_ACCEPTANCE_DECISIONS };
