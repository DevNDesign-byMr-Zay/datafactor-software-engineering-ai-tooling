import { fingerprintRuntimeAcceptanceReceipt } from './runtime-acceptance-receipt.js';

export const RUNTIME_ACCEPTANCE_DECISIONS = Object.freeze({
  REJECTED: 'rejected',
  UNCHANGED: 'unchanged',
  CHANGED: 'changed',
});

function readAcceptedMarker(receipt) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    throw new TypeError('receipt must be an object');
  }
  const prototype = Object.getPrototypeOf(receipt);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('receipt must be a plain object');
  }

  const descriptor = Object.getOwnPropertyDescriptor(receipt, 'accepted');
  if (!descriptor) return false;
  if (!descriptor.enumerable) {
    throw new TypeError('receipt.accepted must be enumerable data');
  }
  if ('get' in descriptor || 'set' in descriptor) {
    throw new TypeError('receipt.accepted must not use accessors');
  }
  return descriptor.value === true;
}

/**
 * Reduce trusted runtime-acceptance evidence to the only states a downstream
 * consumer needs for change detection. Provider/process diagnostics are not
 * accepted by this boundary and never participate in the decision.
 */
export function decideRuntimeAcceptanceChange(receipt, previousFingerprint) {
  if (!readAcceptedMarker(receipt)) {
    return RUNTIME_ACCEPTANCE_DECISIONS.REJECTED;
  }

  const currentFingerprint = fingerprintRuntimeAcceptanceReceipt(receipt);
  return currentFingerprint === previousFingerprint
    ? RUNTIME_ACCEPTANCE_DECISIONS.UNCHANGED
    : RUNTIME_ACCEPTANCE_DECISIONS.CHANGED;
}
