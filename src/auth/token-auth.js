import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';

// Canonical adapter for the authenticated token-authentication regression fix.
// The historical final artifact remains unchanged under Software Engineering & AI Tooling/.

/**
 * @typedef {{ method: string, header(name: string): string | undefined }} TokenAuthRequest
 * @typedef {{ sendStatus(code: number): unknown, status(code: number): { json(body: { error: string }): unknown } }} TokenAuthResponse
 * @typedef {(error?: unknown) => unknown} TokenAuthNext
 */

/**
 * @param {string | number | boolean | null | undefined} [configuredToken]
 * @returns {(req: TokenAuthRequest, res: TokenAuthResponse, next: TokenAuthNext) => unknown}
 */
export function createTokenAuthMiddleware(configuredToken = '') {
  // Missing credentials must not become the literal tokens "null" or "undefined".
  const expected = configuredToken == null ? '' : String(configuredToken);
  const expectedBytes = Buffer.from(expected, 'utf8');
  return (req, res, next) => {
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    // Never invoke a request credential accessor when authentication is unconfigured.
    if (!expected) return res.status(401).json({ error: 'Unauthorized' });

    let token;
    try {
      token = req.header('x-app-token');
    } catch {
      // A malformed request/header adapter must fail closed without exposing details.
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (typeof token === 'string') {
      const receivedBytes = Buffer.from(token, 'utf8');
      if (
        receivedBytes.length === expectedBytes.length &&
        timingSafeEqual(receivedBytes, expectedBytes)
      ) {
        return next();
      }
    }
    return res.status(401).json({ error: 'Unauthorized' });
  };
}
