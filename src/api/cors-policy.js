// Canonical adapter for the authenticated CORS foundation artifact.

/**
 * @typedef {(error: Error | null, allowed?: boolean) => unknown} CorsOriginCallback
 * @typedef {{ status(code: number): { json(body: { error: string }): unknown } }} CorsResponse
 * @typedef {(error?: unknown) => unknown} CorsNext
 */

/**
 * @param {string[]} [allowedOrigins]
 * @returns {(origin: string | undefined, callback: CorsOriginCallback) => unknown}
 */
export function createCorsOriginValidator(allowedOrigins = []) {
  const allowed = [...allowedOrigins];
  return (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowed.includes(origin)) return callback(null, true);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  };
}

/**
 * @returns {(error: { message?: string } | null | undefined, request: unknown, response: CorsResponse, next: CorsNext) => unknown}
 */
export function createCorsErrorHandler() {
  return (error, _req, res, next) => {
    if (error?.message?.startsWith('Not allowed by CORS')) {
      return res.status(403).json({ error: error.message });
    }
    return next(error);
  };
}

/**
 * @param {string[]} [allowedOrigins]
 */
export function createCorsPolicy(allowedOrigins = []) {
  return {
    options: {
      origin: createCorsOriginValidator(allowedOrigins),
      credentials: true,
    },
    errorHandler: createCorsErrorHandler(),
  };
}
