const ROUTE_FAILURE_SCHEMA_VERSION = 1;
const MAX_CONTEXT_STRING_LENGTH = 256;
const RESERVED_CONTEXT_KEYS = new Set([
  'schemaVersion',
  'event',
  'errorName',
  'errorCode',
  '__proto__',
  'prototype',
  'constructor',
]);
const SENSITIVE_CONTEXT_KEY =
  /secret|token|api[_-]?key|auth|pass(?:word|phrase)?|credential|cookie|session|bearer|private[_-]?key/iu;
const SAFE_ERROR_LABEL = /^[a-z][a-z0-9_.-]{0,63}$/iu;

/**
 * @typedef {object} RouteFailureRecordInput
 * @property {string} event
 * @property {unknown} [error]
 * @property {Record<string, unknown>} [context]
 */

/**
 * @param {Record<string, unknown> | null | undefined} context
 * @returns {Record<string, string | number | boolean | null>}
 */
export function sanitizeRouteFailureContext(context) {
  /** @type {Record<string, string | number | boolean | null>} */
  const safe = {};
  if (!context || typeof context !== 'object' || Array.isArray(context)) return safe;

  // Do not invoke accessor properties or allow context to rewrite record identity.
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(context))) {
    if (
      RESERVED_CONTEXT_KEYS.has(key) ||
      SENSITIVE_CONTEXT_KEY.test(key) ||
      !('value' in descriptor)
    )
      continue;

    const value = descriptor.value;
    if (value === null) {
      safe[key] = null;
    } else if (
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value))
    ) {
      safe[key] = value;
    } else if (typeof value === 'string') {
      safe[key] = value.slice(0, MAX_CONTEXT_STRING_LENGTH);
    }
  }
  return safe;
}

/**
 * @param {RouteFailureRecordInput} input
 * @returns {Readonly<Record<string, string | number | boolean | null>>}
 */
export function createRouteFailureRecord({ event, error, context = {} }) {
  if (typeof event !== 'string' || !event) {
    throw new TypeError('event is required');
  }

  /** @type {Record<string, string | number | boolean | null>} */
  const record = {
    schemaVersion: ROUTE_FAILURE_SCHEMA_VERSION,
    event,
    ...sanitizeRouteFailureContext(context),
  };

  const errorLike =
    error && typeof error === 'object'
      ? /** @type {{ name?: unknown, code?: unknown }} */ (error)
      : null;

  if (typeof errorLike?.name === 'string' && SAFE_ERROR_LABEL.test(errorLike.name)) {
    record.errorName = errorLike.name;
  }
  if (typeof errorLike?.code === 'string' && SAFE_ERROR_LABEL.test(errorLike.code)) {
    record.errorCode = errorLike.code;
  }

  return Object.freeze(record);
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isRouteFailureRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = /** @type {Record<string, unknown>} */ (value);
  return (
    record.schemaVersion === ROUTE_FAILURE_SCHEMA_VERSION &&
    typeof record.event === 'string' &&
    record.event.length > 0 &&
    Object.values(record).every(
      (entry) =>
        entry === null ||
        typeof entry === 'string' ||
        (typeof entry === 'number' && Number.isFinite(entry)) ||
        typeof entry === 'boolean',
    )
  );
}

export { ROUTE_FAILURE_SCHEMA_VERSION };
