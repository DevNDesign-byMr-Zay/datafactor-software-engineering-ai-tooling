import {
  healthSnapshot,
  isAuthorizedRequest,
  isOriginAllowed,
  parseAllowedOrigins,
  requiresAppToken,
} from '../../src/reliability/backend-config.js';

describe('backend configuration policy', () => {
  test('normalizes comma-separated CORS origins', () => {
    expect(parseAllowedOrigins(' https://a.example,https://b.example ,, ')).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
  });

  test('allows no-origin requests and configured origins', () => {
    const allowed = ['https://a.example'];
    expect(isOriginAllowed(undefined, allowed)).toBe(true);
    expect(isOriginAllowed('https://a.example', allowed)).toBe(true);
    expect(isOriginAllowed('https://evil.example', allowed)).toBe(false);
  });

  test('requires and validates the application token consistently', () => {
    expect(requiresAppToken('secret')).toBe(true);
    expect(requiresAppToken('')).toBe(false);
    expect(isAuthorizedRequest({ configuredToken: 'secret', providedToken: 'secret' })).toBe(true);
    expect(isAuthorizedRequest({ configuredToken: 'secret', providedToken: 'wrong' })).toBe(false);
    expect(isAuthorizedRequest({ configuredToken: '', providedToken: '' })).toBe(false);
  });

  test('builds a deterministic health snapshot from environment state', () => {
    expect(
      healthSnapshot({
        env: {
          APP_API_TOKEN: 'secret',
          BUCKET_NAME: 'bucket-a',
          GOOGLE_CLOUD_PROJECT: 'project-a',
          GOOGLE_CLOUD_REGION: 'us-east1',
        },
        allowedOrigins: ['https://a.example'],
      }),
    ).toEqual({
      ok: true,
      project: 'project-a',
      location: 'us-east1',
      model: 'gemini-1.5-flash',
      bucket: 'bucket-a',
      corsAllowed: ['https://a.example'],
      auth: {
        protected: ['/upload', '/chat', '/sign'],
        header: 'x-app-token',
        required: true,
      },
    });
  });
});
