import {
  decideRuntimeAcceptanceChange,
  RUNTIME_ACCEPTANCE_DECISIONS,
} from './runtime-acceptance-decision.js';
import { fingerprintRuntimeAcceptanceReceipt } from './runtime-acceptance-receipt.js';

const FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/;

function rejected(reason) {
  return Object.freeze({
    status: RUNTIME_ACCEPTANCE_DECISIONS.REJECTED,
    fingerprint: null,
    reason,
  });
}

/**
 * Verify the durable receipt + fingerprint pair before a downstream consumer
 * performs change detection. Operational release diagnostics are deliberately
 * outside this boundary.
 */
export function consumeRuntimeAcceptanceEvidence({
  receipt,
  receiptFingerprint,
  previousFingerprint,
} = {}) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    return rejected('invalid receipt');
  }

  if (receipt.accepted !== true) {
    return rejected('acceptance rejected');
  }

  if (
    typeof receiptFingerprint !== 'string' ||
    !FINGERPRINT_PATTERN.test(receiptFingerprint)
  ) {
    return rejected('invalid receipt fingerprint');
  }

  let currentFingerprint;
  try {
    currentFingerprint = fingerprintRuntimeAcceptanceReceipt(receipt);
  } catch {
    return rejected('invalid receipt');
  }

  if (currentFingerprint !== receiptFingerprint) {
    return rejected('receipt fingerprint mismatch');
  }

  const status = decideRuntimeAcceptanceChange(receipt, previousFingerprint);
  return Object.freeze({
    status,
    fingerprint: currentFingerprint,
    reason: null,
  });
}
