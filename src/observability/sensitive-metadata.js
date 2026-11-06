/**
 * One source of truth for secret-bearing diagnostic field names.
 *
 * Logs, error reports and API failure receipts have different envelope
 * contracts, but must agree on which metadata keys are never copied.
 * This intentionally filters by key rather than inspecting values.
 */
const SENSITIVE_DIAGNOSTIC_KEY =
  /secret|token|api[_-]?key|auth|pass(?:word|phrase)?|credential|cookie|session|bearer|private[_-]?key/iu;

/**
 * @param {unknown} key
 * @returns {boolean}
 */
export function isSensitiveDiagnosticKey(key) {
  return typeof key === 'string' && SENSITIVE_DIAGNOSTIC_KEY.test(key);
}
