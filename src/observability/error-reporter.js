import { getLogger } from './json-logger.js';
import { isSensitiveDiagnosticKey } from './sensitive-metadata.js';

const DEFAULT_LOGGER = getLogger('error-reporter');
const RESERVED_CONTEXT_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const SAFE_ERROR_NAME = /^[a-z][a-z0-9_.-]{0,63}$/iu;

function sanitizeContext(context = {}) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    throw new TypeError('error reporter context must be a plain object');
  }

  const safe = {};
  let descriptors;
  try {
    descriptors = Object.getOwnPropertyDescriptors(context);
  } catch {
    throw new TypeError('error reporter context must be a plain object');
  }

  // Copy enumerable own data fields only. Accessors can execute code when read.
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (
      !descriptor.enumerable ||
      !Object.hasOwn(descriptor, 'value') ||
      RESERVED_CONTEXT_KEYS.has(key) ||
      isSensitiveDiagnosticKey(key)
    ) {
      continue;
    }
    const value = descriptor.value;
    if (typeof value === 'string') safe[key] = value.slice(0, 256);
    else if (typeof value === 'number' && Number.isFinite(value)) safe[key] = value;
    else if (typeof value === 'boolean' || value === null) safe[key] = value;
  }
  return Object.freeze(safe);
}

function reporterFailureMetadata(error) {
  let errorName = 'Error';
  try {
    if (
      error instanceof Error &&
      typeof error.name === 'string' &&
      SAFE_ERROR_NAME.test(error.name)
    ) {
      errorName = error.name;
    }
  } catch {
    // Untrusted error accessors must not break the request path.
  }
  return Object.freeze({ event: 'error_reporter.failed', errorName });
}

function warnReporterFailure(logger, error) {
  try {
    logger?.warn?.(reporterFailureMetadata(error), 'Error reporter failed');
  } catch {
    // Telemetry and its fallback logger must both remain non-fatal.
  }
}

export function createErrorReporter({ capture = null, logger = DEFAULT_LOGGER } = {}) {
  if (capture !== null && typeof capture !== 'function') {
    throw new TypeError('capture must be a function when provided');
  }

  return Object.freeze({
    capture(error, context = {}) {
      if (!capture) return false;
      let bounded;
      try {
        bounded = sanitizeContext(context);
      } catch {
        return false;
      }

      try {
        const result = capture(error, bounded);
        if (result && typeof result.then === 'function') {
          void Promise.resolve(result).catch((reporterError) => {
            warnReporterFailure(logger, reporterError);
          });
        }
        return true;
      } catch (reporterError) {
        warnReporterFailure(logger, reporterError);
        return false;
      }
    },
  });
}
