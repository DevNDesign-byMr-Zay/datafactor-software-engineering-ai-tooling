// Canonical maintained extraction from the authenticated restored backend entry point.

/** @param {string | number | boolean | null | undefined} [value] */
export function parseAllowedOrigins(value = '') {
  return String(value)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/** @param {string | undefined} origin @param {string[]} allowedOrigins */
export function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}

/** @param {string | number | boolean | null | undefined} configuredToken */
export function requiresAppToken(configuredToken) {
  return Boolean(configuredToken);
}

/** @param {{ configuredToken?: string, providedToken?: string }} request */
export function isAuthorizedRequest({ configuredToken = '', providedToken = '' }) {
  if (!configuredToken) return false;
  return providedToken === configuredToken;
}

/**
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   allowedOrigins?: string[]
 * }} [options]
 */
export function healthSnapshot({ env = {}, allowedOrigins = [] } = {}) {
  const token = env.APP_API_TOKEN || '';
  return {
    ok: true,
    project: env.GOOGLE_CLOUD_PROJECT || null,
    location: env.GOOGLE_CLOUD_REGION || 'us-central1',
    model: 'gemini-1.5-flash',
    bucket: env.BUCKET_NAME || null,
    corsAllowed: [...allowedOrigins],
    auth: {
      protected: ['/upload', '/chat', '/sign'],
      header: 'x-app-token',
      required: requiresAppToken(token),
    },
  };
}
