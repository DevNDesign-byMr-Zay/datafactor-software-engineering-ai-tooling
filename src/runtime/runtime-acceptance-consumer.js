import {
  decideRuntimeAcceptanceChange,
  RUNTIME_ACCEPTANCE_DECISIONS,
} from './runtime-acceptance-decision.js';
import { fingerprintRuntimeAcceptanceReceipt } from './runtime-acceptance-receipt.js';

const FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/;
const INPUT_KEYS = Object.freeze(['receipt', 'receiptFingerprint', 'previousFingerprint']);

function rejected(reason) {
  return Object.freeze({
    status: RUNTIME_ACCEPTANCE_DECISIONS.REJECTED,
    fingerprint: null,
    reason,
  });
}

function readConsumerInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('runtime acceptance consumer input must be an object');
  }
  if (Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null) {
    throw new TypeError('runtime acceptance consumer input must be a plain object');
  }
  if (Object.getOwnPropertySymbols(input).length > 0) {
    throw new TypeError('runtime acceptance consumer input must not contain symbol properties');
  }

  const descriptors = Object.getOwnPropertyDescriptors(input);
  const values = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!INPUT_KEYS.includes(key)) {
      throw new TypeError(`runtime acceptance consumer input contains unsupported field: ${key}`);
    }
    if (!descriptor.enumerable) {
      throw new TypeError(`runtime acceptance consumer input.${key} must be enumerable data`);
    }
    if ('get' in descriptor || 'set' in descriptor) {
      throw new TypeError(`runtime acceptance consumer input.${key} must not use accessors`);
    }
    Object.defineProperty(values, key, {
      value: descriptor.value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return values;
}

/**
 * Verify the durable receipt + fingerprint pair before a downstream consumer
 * performs change detection. Operational release diagnostics remain outside
 * this boundary, and this result grants no deployment or provider authority.
 */
export function consumeRuntimeAcceptanceEvidence(input = {}) {
  let values;
  try {
    values = readConsumerInput(input);
  } catch {
    return rejected('invalid consumer input');
  }

  const { receipt, receiptFingerprint, previousFingerprint } = values;
  if (typeof receiptFingerprint !== 'string' || !FINGERPRINT_PATTERN.test(receiptFingerprint)) {
    return rejected('invalid receipt fingerprint');
  }
  if (
    previousFingerprint !== undefined &&
    (typeof previousFingerprint !== 'string' || !FINGERPRINT_PATTERN.test(previousFingerprint))
  ) {
    return rejected('invalid previous fingerprint');
  }

  let status;
  try {
    status = decideRuntimeAcceptanceChange(receipt, previousFingerprint);
  } catch {
    return rejected('invalid receipt');
  }
  if (status === RUNTIME_ACCEPTANCE_DECISIONS.REJECTED) {
    return rejected('acceptance rejected');
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

  return Object.freeze({
    status,
    fingerprint: currentFingerprint,
    reason: null,
  });
}
