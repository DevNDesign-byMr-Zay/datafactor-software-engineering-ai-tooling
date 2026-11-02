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
  const expected = String(configuredToken);
  const expectedBytes = Buffer.from(expected, 'utf8');
  return (req, res, next) => {
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    const token = req.header('x-app-token');
    if (expected && typeof token === 'string') {
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
