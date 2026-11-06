/**
 * Shared outer HTTP error boundary for both local ÆtherForge server adapters.
 *
 * Expected request-body failures retain their original status and message
 * without generating an unhandled-error diagnostic. Unhandled exceptions
 * continue through the adapter's existing privacy-bounded error tracker.
 */
export function createWorkbenchFailureHandler({ RequestBodyError, respond, errorTracker }) {
  if (typeof RequestBodyError !== 'function' || typeof respond !== 'function') {
    throw new TypeError('HTTP failure handler requires a body error type and responder');
  }
  if (!errorTracker || typeof errorTracker.capture !== 'function') {
    throw new TypeError('HTTP failure handler requires an error tracker');
  }

  return function handleHttpFailure(error, req, res) {
    if (error instanceof RequestBodyError) {
      // A closed connection cannot receive an error response.
      if (req.aborted || res.destroyed) return;
      res.setHeader('Connection', 'close');
      if (error.statusCode === 503) res.setHeader('Retry-After', '1');
      return respond(res, error.statusCode, { error: error.message });
    }

    // The tracker already restricts methods/routes and omits exception text.
    errorTracker.capture(error, req);
    return respond(res, 500, { error: 'Workbench request failed' });
  };
}
