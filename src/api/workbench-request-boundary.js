/**
 * Local-only and private Codespaces host/origin safeguards shared by both
 * ÆtherForge HTTP adapters. This function never grants a new host or origin.
 *
 * A null result indicates acceptance; all other results are the exact
 * existing 403 error messages used by both adapters.
 */
export function rejectWorkbenchRequestBoundary(
  req,
  {
    port,
    codespacesEnabled = process.env.CODESPACES === 'true',
    codespaceName = process.env.CODESPACE_NAME,
  } = {},
) {
  const host = String(req.headers.host || '');
  const localHost = /^(?:127\.0\.0\.1|localhost)(?::[0-9]{1,5})?$/.test(host);
  const csName = String(codespaceName || '');
  const csHost =
    codespacesEnabled && /^[a-z0-9-]{1,90}$/.test(csName)
      ? `${csName}-${Number(port)}.app.github.dev`
      : '';
  const privateForward = Boolean(csHost) && host === csHost;

  if (!localHost && !privateForward) {
    return 'Local or private Codespaces host required';
  }

  const origin = String(req.headers.origin || '');
  const allowedOrigins = [(privateForward ? 'https://' : 'http://') + host];

  // Private GitHub forwarding may rewrite Host while keeping the real Origin.
  if (localHost && csHost) allowedOrigins.push('https://' + csHost);
  if (origin && !allowedOrigins.includes(origin)) {
    return 'Cross-origin requests are not accepted';
  }

  const fetchSite = String(req.headers['sec-fetch-site'] || '');
  if (fetchSite === 'cross-site') {
    return 'Cross-site requests are not accepted';
  }

  return null;
}
