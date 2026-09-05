import {
  buildCloudRunDeployArgs,
  buildCloudRunSmokePlan,
  createCloudRunDeploymentPlan,
  executeCloudRunSmokePlan,
  listEnvFileSensitiveKeys,
  requiresEnvFileForValue,
  runCloudRunSmokeTest,
  validateCloudRunEnvironment,
} from '../../src/deployment/cloud-run.js';

const readyEnvironment = {
  BUCKET_NAME: 'production-bucket',
  ALLOWED_ORIGINS: 'https://app.example.com,https://admin.example.com',
  APP_API_TOKEN: 'secure-app-token',
  GEMINI_API_KEY: 'secure-provider-key',
};

function jsonResponse(body, { status = 200, ok = status >= 200 && status < 300 } = {}) {
  return {
    status,
    ok,
    json: async () => body,
  };
}

describe('Cloud Run deployment planning', () => {
  test('preserves the authenticated env-file deployment shape', () => {
    expect(buildCloudRunDeployArgs({ serviceName: 'example-service' })).toEqual([
      'run',
      'deploy',
      'example-service',
      '--source',
      '.',
      '--region',
      'us-central1',
      '--allow-unauthenticated',
      '--env-vars-file',
      'run-env.yaml',
    ]);
  });

  test('supports explicit region, source, env file, and authentication policy', () => {
    expect(
      buildCloudRunDeployArgs({
        serviceName: 'worker',
        region: 'us-east1',
        source: './service',
        envVarsFile: 'deployment.yaml',
        allowUnauthenticated: false,
      }),
    ).toEqual([
      'run',
      'deploy',
      'worker',
      '--source',
      './service',
      '--region',
      'us-east1',
      '--env-vars-file',
      'deployment.yaml',
    ]);
  });

  test.each([
    [{}, 'serviceName'],
    [{ serviceName: '   ' }, 'serviceName'],
    [{ serviceName: 'svc', region: '' }, 'region'],
    [{ serviceName: 'svc', source: '' }, 'source'],
    [{ serviceName: 'svc', envVarsFile: '' }, 'envVarsFile'],
  ])('rejects invalid deploy input %#', (input, field) => {
    expect(() => buildCloudRunDeployArgs(input)).toThrow(field);
  });

  test('detects comma-delimited values that should use an env file', () => {
    expect(requiresEnvFileForValue('http://localhost:5173,http://localhost:3000')).toBe(true);
    expect(requiresEnvFileForValue('single-value')).toBe(false);
    expect(requiresEnvFileForValue(undefined)).toBe(false);
  });

  test('lists env-file-sensitive keys deterministically', () => {
    expect(
      listEnvFileSensitiveKeys({
        APP_API_TOKEN: '<set-secure-token>',
        ALLOWED_ORIGINS: 'http://localhost:5173,http://localhost:3000',
        EXTRA_LIST: 'one,two',
      }),
    ).toEqual(['ALLOWED_ORIGINS', 'EXTRA_LIST']);
  });

  test('rejects non-object environment input', () => {
    expect(() => listEnvFileSensitiveKeys(null)).toThrow('environment must be an object');
    expect(() => listEnvFileSensitiveKeys([])).toThrow('environment must be an object');
  });

  test('accepts a fully resolved historical environment-file shape', () => {
    expect(validateCloudRunEnvironment(readyEnvironment)).toEqual({
      valid: true,
      errors: [],
      envFileSensitiveKeys: ['ALLOWED_ORIGINS'],
    });
  });

  test('rejects unresolved secret placeholders from the historical example file', () => {
    const report = validateCloudRunEnvironment({
      BUCKET_NAME: 'example-bucket',
      ALLOWED_ORIGINS: 'http://localhost:5173,http://localhost:3000',
      APP_API_TOKEN: '<set-secure-token>',
      GEMINI_API_KEY: '<set-provider-key>',
    });

    expect(report.valid).toBe(false);
    expect(report.errors).toEqual([
      'unresolved placeholder environment value: APP_API_TOKEN',
      'unresolved placeholder environment value: GEMINI_API_KEY',
    ]);
    expect(report.envFileSensitiveKeys).toEqual(['ALLOWED_ORIGINS']);
  });

  test('reports missing required environment values without exposing provided values', () => {
    expect(validateCloudRunEnvironment({ BUCKET_NAME: 'bucket' }).errors).toEqual([
      'missing required environment value: ALLOWED_ORIGINS',
      'missing required environment value: APP_API_TOKEN',
      'missing required environment value: GEMINI_API_KEY',
    ]);
  });

  test('supports narrower environment requirements for reusable deployment utilities', () => {
    expect(
      validateCloudRunEnvironment({ SERVICE_MODE: 'worker' }, { requiredKeys: ['SERVICE_MODE'] }),
    ).toEqual({ valid: true, errors: [], envFileSensitiveKeys: [] });
  });

  test('builds authenticated health and chat smoke requests', () => {
    expect(
      buildCloudRunSmokePlan({
        serviceUrl: 'https://service.example.run.app/',
        token: 'secret',
      }),
    ).toEqual([
      {
        method: 'GET',
        url: 'https://service.example.run.app/health',
        headers: { 'x-app-token': 'secret' },
      },
      {
        method: 'POST',
        url: 'https://service.example.run.app/chat',
        headers: {
          'x-app-token': 'secret',
          'content-type': 'application/json',
        },
        body: {
          sessionId: 'smoke',
          text: 'Say hi.',
        },
      },
    ]);
  });

  test('strips query fragments while preserving an explicit service base path', () => {
    const [health] = buildCloudRunSmokePlan({
      serviceUrl: 'https://service.example.run.app/base/?debug=1#fragment',
      token: 'secret',
    });

    expect(health.url).toBe('https://service.example.run.app/base/health');
  });

  test.each([
    [{ token: 'secret' }, 'serviceUrl'],
    [{ serviceUrl: 'not-a-url', token: 'secret' }, 'valid absolute URL'],
    [{ serviceUrl: 'ftp://example.com', token: 'secret' }, 'http or https'],
    [{ serviceUrl: 'https://example.com', token: '' }, 'token'],
    [{ serviceUrl: 'https://example.com', token: 'secret', sessionId: '' }, 'sessionId'],
    [{ serviceUrl: 'https://example.com', token: 'secret', text: '' }, 'text'],
  ])('rejects invalid smoke input %#', (input, message) => {
    expect(() => buildCloudRunSmokePlan(input)).toThrow(message);
  });

  test('executes the historical health then chat smoke sequence in order', async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      return url.endsWith('/health')
        ? jsonResponse({ ok: true, service: 'ai-service' })
        : jsonResponse({ reply: 'hi', sessionId: 'smoke' });
    };

    const results = await runCloudRunSmokeTest({
      serviceUrl: 'https://service.example.run.app',
      token: 'secret',
      fetchImpl,
    });

    expect(calls).toEqual([
      {
        url: 'https://service.example.run.app/health',
        options: {
          method: 'GET',
          headers: { 'x-app-token': 'secret' },
        },
      },
      {
        url: 'https://service.example.run.app/chat',
        options: {
          method: 'POST',
          headers: {
            'x-app-token': 'secret',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ sessionId: 'smoke', text: 'Say hi.' }),
        },
      },
    ]);
    expect(results).toEqual([
      {
        method: 'GET',
        url: 'https://service.example.run.app/health',
        status: 200,
        ok: true,
        body: { ok: true, service: 'ai-service' },
      },
      {
        method: 'POST',
        url: 'https://service.example.run.app/chat',
        status: 200,
        ok: true,
        body: { reply: 'hi', sessionId: 'smoke' },
      },
    ]);
  });

  test('fails fast on a non-success smoke response and exposes completed evidence', async () => {
    const plan = buildCloudRunSmokePlan({
      serviceUrl: 'https://service.example.run.app',
      token: 'secret',
    });
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse({ error: 'provider unavailable' }, { status: 503 }));

    await expect(executeCloudRunSmokePlan(plan, { fetchImpl })).rejects.toMatchObject({
      message: expect.stringContaining('returned 503'),
      result: expect.objectContaining({ status: 503, ok: false }),
      results: [
        expect.objectContaining({ status: 200, ok: true }),
        expect.objectContaining({ status: 503, ok: false }),
      ],
    });
  });

  test('distinguishes transport failure from an HTTP failure', async () => {
    const plan = buildCloudRunSmokePlan({
      serviceUrl: 'https://service.example.run.app',
      token: 'secret',
    });

    await expect(
      executeCloudRunSmokePlan(plan, {
        fetchImpl: async () => {
          throw new Error('connection refused');
        },
      }),
    ).rejects.toThrow('failed before response');
  });

  test('rejects malformed execution dependencies before making requests', async () => {
    await expect(executeCloudRunSmokePlan([])).rejects.toThrow('plan must be a non-empty array');
    await expect(
      executeCloudRunSmokePlan([{ method: 'GET', url: 'https://example.com' }], {
        fetchImpl: null,
      }),
    ).rejects.toThrow('fetchImpl must be a function');
  });

  test('combines deploy, environment readiness, and smoke behavior into one plan', () => {
    expect(
      createCloudRunDeploymentPlan({
        serviceName: 'service',
        serviceUrl: 'https://service.example.run.app',
        token: 'token',
        environment: readyEnvironment,
      }),
    ).toMatchObject({
      command: 'gcloud',
      environmentReport: {
        valid: true,
        errors: [],
        envFileSensitiveKeys: ['ALLOWED_ORIGINS'],
      },
      envFileSensitiveKeys: ['ALLOWED_ORIGINS'],
      args: expect.arrayContaining(['deploy', 'service', '--env-vars-file', 'run-env.yaml']),
      smoke: [
        expect.objectContaining({ method: 'GET', url: 'https://service.example.run.app/health' }),
        expect.objectContaining({ method: 'POST', url: 'https://service.example.run.app/chat' }),
      ],
    });
  });
});
