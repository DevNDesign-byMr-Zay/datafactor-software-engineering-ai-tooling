import { describe, expect, jest, test } from '@jest/globals';
import { createErrorWebhookCapture } from '../../src/observability/error-webhook.js';
import { createHttpErrorTracker } from '../../apps/aetherforge-workbench/http-error-tracker.js';

function approved() {
  return { event: 'http.request.unhandled', requestId: 'safe-request-id', route: '/api/assets', method: 'GET', statusCode: 500 };
}
describe('opt-in external HTTP error telemetry', () => {
  test('remains disabled by default and refuses unsafe destinations when enabled', () => {
    expect(createErrorWebhookCapture()).toBeNull();
    for (const url of ['http://example.com/capture', 'https://127.0.0.1/capture', 'https://localhost/capture', 'https://example.com/capture?token=SECRET', 'https://name:password@example.com/', 'https://example.com:8443/', 'https://private.internal/capture']) {
      expect(() => createErrorWebhookCapture({ enabled: true, url })).toThrow(/URL/u);
    }
  });
  test('sends only an allowlisted envelope and never the exception or untrusted metadata', async () => {
    const requests = [];
    const capture = createErrorWebhookCapture({
      enabled: true,
      url: 'https://errors.example.com/ingest',
      fetchImpl: jest.fn(async (url, options) => { requests.push({ url, options }); return { ok: true }; }),
    });
    await expect(capture(new Error('secret password'), { ...approved(), token: 'DO_NOT_EXPORT', query: 'private-query', stack: 'sensitive-stack' })).resolves.toBeUndefined();
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://errors.example.com/ingest');
    expect(requests[0].options.method).toBe('POST');
    expect(requests[0].options.redirect).toBe('error');
    expect(requests[0].options.credentials).toBe('omit');
    expect(JSON.parse(requests[0].options.body)).toEqual({ schemaVersion: 1, ...approved() });
    expect(JSON.stringify(requests)).not.toMatch(/DO_NOT_EXPORT|private-query|secret password|sensitive-stack/u);
  });
  test('refuses forged routing and non-500 telemetry', async () => {
    const spy = jest.fn();
    const capture = createErrorWebhookCapture({ enabled: true, url: 'https://errors.example.com/ingest', fetchImpl: spy });
    await expect(capture(null, { ...approved(), route: '/api/private?secret=1' })).rejects.toThrow(/Untrusted/u);
    await expect(capture(null, { ...approved(), statusCode: 403 })).rejects.toThrow(/Untrusted/u);
    expect(spy).not.toHaveBeenCalled();
  });
  test('returns failed delivery as a rejected promise for the shared reporter to contain', async () => {
    const capture = createErrorWebhookCapture({ enabled: true, url: 'https://errors.example.com/ingest', fetchImpl: async () => ({ ok: false }) });
    await expect(capture(null, approved())).rejects.toThrow('Error webhook delivery failed');
  });
  test('tracker preserves structured logs and safely dispatches sanitized telemetry', async () => {
    const log = jest.fn();
    const telemetry = jest.fn(async () => undefined);
    const tracker = createHttpErrorTracker('aetherforge-workbench', {
      logger: { error: log, warn: jest.fn() },
      createRequestId: () => 'r-1',
      captureTelemetry: telemetry,
    });
    expect(tracker.capture(new Error('raw error with secret'), { url: '/api/assets?token=secret', method: 'GET' })).toBe(true);
    await Promise.resolve();
    expect(log).toHaveBeenCalledTimes(1);
    expect(telemetry).toHaveBeenCalledTimes(1);
    expect(telemetry.mock.calls[0][1]).toEqual({
      event: 'http.request.unhandled',
      requestId: 'r-1',
      route: '/api/assets',
      method: 'GET',
      statusCode: 500,
    });
  });
});
