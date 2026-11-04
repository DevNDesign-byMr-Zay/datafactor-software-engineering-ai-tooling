// Shared by the loopback/private-forward adapters. Limits apply to bytes received,
// and the deadline is absolute: a trickle of data cannot keep a body open forever.
export class RequestBodyError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'RequestBodyError';
    this.statusCode = statusCode;
  }
}

export function createRequestBodyReader({ timeoutMs = 15000, maxConcurrent = 8 } = {}) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300000) {
    throw new RangeError('Request body timeout must be 1 to 300000 milliseconds');
  }
  if (!Number.isSafeInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 64) {
    throw new RangeError('Concurrent body request limit must be 1 to 64');
  }
  let activeRequests = 0;

  return function readRequestBody(req, res, maxBytes, tooLargeMessage) {
    return new Promise((resolve, reject) => {
      const overloaded = activeRequests >= maxConcurrent;
      if (!overloaded) {
        activeRequests += 1;
        // Keep the reservation through validation, filesystem writes or execution,
        // rather than accepting more bodies as soon as one finishes buffering.
        const release = () => {
          activeRequests -= 1;
          res.off('finish', release);
          res.off('close', release);
        };
        res.once('finish', release);
        res.once('close', release);
      }
      let chunks = [];
      let size = 0;
      let settled = false;
      const timer = setTimeout(
        () => finish(new RequestBodyError(408, 'Request body deadline exceeded')),
        timeoutMs,
      );
      timer.unref();

      function finish(error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        req.off('data', onData);
        req.off('end', onEnd);
        req.off('aborted', onAborted);
        req.off('error', onError);
        req.off('close', onClose);
        if (error) {
          chunks = [];
          // The adapter sends a final error with Connection: close. Pause instead
          // of destroying now so that its 408/413 reaches the client intact.
          req.pause();
          if (!req.closed) {
            const ignoreError = () => {};
            req.on('error', ignoreError);
            req.once('close', () => req.off('error', ignoreError));
          }
          reject(error);
        } else {
          const body = Buffer.concat(chunks, size);
          chunks = [];
          resolve(body);
        }
      }

      function onData(chunk) {
        size += chunk.length;
        if (size > maxBytes) return finish(new RequestBodyError(413, tooLargeMessage));
        chunks.push(chunk);
      }
      function onEnd() {
        finish();
      }
      function onAborted() {
        finish(new RequestBodyError(400, 'Request body was aborted'));
      }
      function onError(error) {
        if (req.aborted) onAborted();
        else finish(error);
      }
      function onClose() {
        if (!req.complete) onAborted();
      }

      req.on('data', onData);
      req.once('end', onEnd);
      req.once('aborted', onAborted);
      req.once('error', onError);
      req.once('close', onClose);
      if (req.aborted || req.destroyed) return onAborted();
      if (overloaded) {
        return finish(new RequestBodyError(503, 'Too many active body requests; retry later'));
      }
      if (Number(req.headers['content-length']) > maxBytes) {
        finish(new RequestBodyError(413, tooLargeMessage));
      }
    });
  };
}
