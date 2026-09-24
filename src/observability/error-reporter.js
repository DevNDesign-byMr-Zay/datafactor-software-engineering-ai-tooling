import { getLogger } from './json-logger.js';

const DEFAULT_LOGGER = getLogger('error-reporter');

function sanitizeContext(context = {}) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    throw new TypeError('error reporter context must be a plain object');
  }

  const safe = {};
  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'string') safe[key] = value.slice(0, 256);
    else if (typeof value === 'number' && Number.isFinite(value)) safe[key] = value;
    else if (typeof value === 'boolean' || value === null) safe[key] = value;
  }
  return Object.freeze(safe);
}

function reporterFailureMetadata(error) {
  return Object.freeze({
    event: 'error_reporter.failed',
    errorName: error instanceof Error ? error.name : 'Error',
  });
}

export function createErrorReporter({ capture = null, logger = DEFAULT_LOGGER } = {}) {
  if (capture !== null && typeof capture !== 'function') {
    throw new TypeError('capture must be a function when provided');
  }

  return Object.freeze({
    capture(error, context = {}) {
      if (!capture) return false;
      const bounded = sanitizeContext(context);

      try {
        const result = capture(error, bounded);
        if (result && typeof result.then === 'function') {
          void Promise.resolve(result).catch((reporterError) => {
            logger?.warn?.(reporterFailureMetadata(reporterError), 'Error reporter failed');
          });
        }
        return true;
      } catch (reporterError) {
        logger?.warn?.(reporterFailureMetadata(reporterError), 'Error reporter failed');
        return false;
      }
    },
  });
}
