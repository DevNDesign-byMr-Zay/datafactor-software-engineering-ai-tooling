// Canonical adapter for the authenticated token-authentication regression fix.
// The historical final artifact remains unchanged under Software Engineering & AI Tooling/.

export function createTokenAuthMiddleware(configuredToken = '') {
  const expected = String(configuredToken);
  return (req, res, next) => {
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    const token = req.header('x-app-token');
    if (expected && token === expected) return next();
    return res.status(401).json({ error: 'Unauthorized' });
  };
}
