import { isSensitiveDiagnosticKey } from '../observability/sensitive-metadata.js';

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

  // A malformed proxy must not turn diagnostic recording into another failure.
  let descriptors;
  try {
    descriptors = Object.getOwnPropertyDescriptors(context);
  } catch {
    return safe;
  }

  // Do not invoke accessor properties or allow context to rewrite record identity.
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (
      RESERVED_CONTEXT_KEYS.has(key) ||
      isSensitiveDiagnosticKey(key) ||
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
 * Read a data-valued error label without evaluating getters, including on
 * standard Error and TypeError prototypes. Bound prototype traversal so
 * malformed objects cannot make failure reporting recurse indefinitely.
 *
 * @param {unknown} error
 * @param {'name' | 'code'} key
 * @returns {string | null}
 */
function safeErrorLabel(error, key) {
  if (!error || typeof error !== 'object') return null;
  /** @type {object | null} */
  let current = error;
  try {
    for (let depth = 0; current && depth < 8; depth += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor) {
        const value = descriptor.value;
        return typeof value === 'string' && SAFE_ERROR_LABEL.test(value) ? value : null;
      }
      current = Object.getPrototypeOf(current);
    }
  } catch {
    return null;
  }
  return null;
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

  const errorName = safeErrorLabel(error, 'name');
  const errorCode = safeErrorLabel(error, 'code');
  if (errorName) record.errorName = errorName;
  if (errorCode) record.errorCode = errorCode;

  return Object.freeze(record);
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isRouteFailureRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const version = descriptors.schemaVersion;
    const event = descriptors.event;
    if (
      !version ||
      !Object.hasOwn(version, 'value') ||
      version.value !== ROUTE_FAILURE_SCHEMA_VERSION ||
      !event ||
      !Object.hasOwn(event, 'value') ||
      typeof event.value !== 'string' ||
      event.value.length === 0
    ) {
      return false;
    }

    return Reflect.ownKeys(descriptors).every((key) => {
      if (typeof key !== 'string') return false;
      const descriptor = descriptors[key];
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) return false;
      const entry = descriptor.value;
      return (
        entry === null ||
        typeof entry === 'string' ||
        (typeof entry === 'number' && Number.isFinite(entry)) ||
        typeof entry === 'boolean'
      );
    });
  } catch {
    return false;
  }
}

export { ROUTE_FAILURE_SCHEMA_VERSION };
