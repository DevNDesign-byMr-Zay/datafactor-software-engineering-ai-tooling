import { randomUUID } from 'node:crypto';
import { getLogger } from './json-logger.js';
import { createErrorReporter } from './error-reporter.js';

const SAFE_ROUTES = new Set([
  '/api/health',
  '/api/diagnostics',
  '/api/run',
  '/api/modules',
  '/api/workbench/summary',
  '/api/assets',
  '/api/assets/upload',
  '/api/execution/run',
  '/api/execution/project',
  '/api/execution/capabilities',
  '/api/workspace/projects',
  '/api/upstream/local-index',
  '/api/upstream/local-file',
]);

const SAFE_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']);

export function boundedRouteLabel(value) {
  if (typeof value !== 'string') return 'unmatched';
  let pathname;
  try {
    pathname = new URL(value, 'http://127.0.0.1').pathname;
  } catch {
    return 'unmatched';
  }
  if (SAFE_ROUTES.has(pathname)) return pathname;
  if (/^\/api\/assets\/[a-f0-9]{64}\.(?:png|jpg|webp)$/u.test(pathname)) {
    return '/api/assets/:id';
  }
  if (/^\/api\/workspace\/projects\/[A-Za-z0-9_-]+$/u.test(pathname)) {
    return '/api/workspace/projects/:id';
  }
  return 'unmatched';
}

export function createHttpErrorTracker(
  name,
  { logger = getLogger(name), createRequestId = randomUUID } = {},
) {
  if (!logger || typeof logger.error !== 'function') {
    throw new TypeError('HTTP error tracker requires a structured error logger');
  }
  if (typeof createRequestId !== 'function') {
    throw new TypeError('HTTP error tracker requires a request ID source');
  }
  const reporter = createErrorReporter({
    capture(_error, context) {
      logger.error(context, 'Unhandled HTTP request');
    },
    logger,
  });
  return Object.freeze({
    capture(error, request) {
      return reporter.capture(error, {
        event: 'http.request.unhandled',
        requestId: createRequestId(),
        route: boundedRouteLabel(request?.url),
        method: SAFE_METHODS.has(request?.method) ? request.method : 'OTHER',
        statusCode: 500,
      });
    },
  });
}
