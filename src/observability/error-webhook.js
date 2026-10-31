/**
 * Operator-opt-in HTTPS error capture. Never transmit exception objects,
 * stack traces, request bodies, query strings, headers, URLs, or credentials.
 * The entire outbound record is a fixed allowlist derived from trusted labels.
 */
const ALLOWED_ROUTES = /^\/api\/[a-z0-9/:.-]{1,80}$/u;
const ALLOWED_EVENTS = new Set(['http.request.unhandled']);
const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'OTHER']);

function normalizeEndpoint(value) {
  if (typeof value !== 'string' || !value) throw new TypeError('Error reporting URL required');
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError('Error reporting URL must be a valid HTTPS URL');
  }
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== 'https:' || url.username || url.password ||
    url.search || url.hash || (url.port && url.port !== '443') ||
    host === 'localhost' || host.endsWith('.localhost') ||
    host.endsWith('.local') || host.endsWith('.internal') ||
    host.includes(':') || /^[0-9.]+$/u.test(host) || !host.includes('.')
  ) {
    throw new TypeError('Error reporting URL must be public HTTPS without credentials or query');
  }
  return url.href;
}

function safeEvent(context) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    throw new TypeError('Error context must be an object');
  }
  const event = context.event;
  const method = context.method;
  const route = context.route;
  const requestId = context.requestId;
  if (
    !ALLOWED_EVENTS.has(event) || !ALLOWED_METHODS.has(method) ||
    (route !== 'unmatched' && (typeof route !== 'string' || !ALLOWED_ROUTES.test(route))) ||
    typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/u.test(requestId) ||
    context.statusCode !== 500
  ) {
    throw new TypeError('Untrusted error reporting fields');
  }
  return { schemaVersion: 1, event, requestId, route, method, statusCode: 500 };
}

export function createErrorWebhookCapture({
  enabled = false,
  url,
  fetchImpl = globalThis.fetch,
  timeoutMs = 1500,
} = {}) {
  if (!enabled) return null;
  const endpoint = normalizeEndpoint(url);
  if (typeof fetchImpl !== 'function') throw new TypeError('Error webhook needs fetch');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 5000) {
    throw new TypeError('Error webhook timeout must be between 100 and 5000 ms');
  }
  return async (_ignoredError, context) => {
    const body = JSON.stringify(safeEvent(context));
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
    });
    if (!response?.ok) throw new Error('Error webhook delivery failed');
  };
}
