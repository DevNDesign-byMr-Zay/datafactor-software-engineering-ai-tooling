import { fingerprintRuntimeAcceptanceReceipt } from './runtime-acceptance-receipt.js';

export const RUNTIME_ACCEPTANCE_DECISIONS = Object.freeze({
  REJECTED: 'rejected',
  UNCHANGED: 'unchanged',
  CHANGED: 'changed',
});

/**
 * Reduce trusted runtime-acceptance evidence to the only states a downstream
 * consumer needs for change detection. Provider/process diagnostics are not
 * accepted by this boundary and never participate in the decision.
 */
export function decideRuntimeAcceptanceChange(receipt, previousFingerprint) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    throw new TypeError('receipt must be an object');
  }

  if (receipt.accepted !== true) {
    return RUNTIME_ACCEPTANCE_DECISIONS.REJECTED;
  }

  const currentFingerprint = fingerprintRuntimeAcceptanceReceipt(receipt);
  return currentFingerprint === previousFingerprint
    ? RUNTIME_ACCEPTANCE_DECISIONS.UNCHANGED
    : RUNTIME_ACCEPTANCE_DECISIONS.CHANGED;
}
