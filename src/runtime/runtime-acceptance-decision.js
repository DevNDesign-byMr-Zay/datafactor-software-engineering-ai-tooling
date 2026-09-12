import { fingerprintRuntimeAcceptanceReceipt } from './runtime-acceptance-receipt.js';

const DECISIONS = Object.freeze({
  REJECTED: 'rejected',
  UNCHANGED: 'unchanged',
  CHANGED: 'changed',
});

/**
 * Resolve the smallest useful consumer decision from trusted runtime evidence.
 * Provider diagnostics never participate in this decision.
 *
 * `previousFingerprint` is intentionally opaque to this helper. Consumers own
 * how a prior trusted observation is retrieved and when it is considered valid.
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
