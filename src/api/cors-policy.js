// Canonical adapter for the authenticated CORS foundation artifact.

export function createCorsOriginValidator(allowedOrigins = []) {
  const allowed = [...allowedOrigins];
  return (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowed.includes(origin)) return callback(null, true);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  };
}

export function createCorsErrorHandler() {
  return (error, _req, res, next) => {
    if (error?.message?.startsWith('Not allowed by CORS')) {
      return res.status(403).json({ error: error.message });
    }
    return next(error);
  };
}

export function createCorsPolicy(allowedOrigins = []) {
  return {
    options: {
      origin: createCorsOriginValidator(allowedOrigins),
      credentials: true,
    },
    errorHandler: createCorsErrorHandler(),
  };
}
