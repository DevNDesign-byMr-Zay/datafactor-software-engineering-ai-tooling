/**
 * Shared HTTP response serializer for the two local ÆtherForge adapters.
 *
 * Each adapter keeps its own routing, host/origin checks and sandbox handling.
 * The commercial edition alone can load public GitHub catalog references.
 * In particular, never use this helper for the deliberately frameable,
 * separately sandboxed commercial /sandbox-frame.html response.
 */
const CSP = Object.freeze({
  companion:
    "default-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'",
  commercial:
    "default-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://api.github.com https://raw.githubusercontent.com",
});

/**
 * Create a responder with a fixed, adapter-specific content security policy.
 *
 * @param {'companion' | 'commercial'} adapter
 */
export function createWorkbenchResponder(adapter) {
  if (!Object.hasOwn(CSP, adapter)) {
    throw new TypeError('Unsupported ÆtherForge response policy');
  }

  const policy = CSP[adapter];
  return function respond(res, code, body, type = 'application/json; charset=utf-8') {
    res.writeHead(code, {
      'Content-Type': type,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': policy,
      'X-Frame-Options': 'DENY',
    });
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };
}
