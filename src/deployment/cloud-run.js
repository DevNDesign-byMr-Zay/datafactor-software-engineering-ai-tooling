const DEFAULT_REGION = 'us-central1';
const DEFAULT_SOURCE = '.';
const DEFAULT_ENV_FILE = 'run-env.yaml';
const DEFAULT_REQUIRED_ENV_KEYS = [
  'BUCKET_NAME',
  'ALLOWED_ORIGINS',
  'APP_API_TOKEN',
  'GEMINI_API_KEY',
];

function requireNonEmptyString(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function validateHttpUrl(value, name) {
  const url = requireNonEmptyString(value, name);
  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    throw new TypeError(`${name} must be a valid absolute URL`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new TypeError(`${name} must use http or https`);
  }
  if (parsed.username || parsed.password) {
    throw new TypeError(`${name} must not include embedded credentials`);
  }

  return { url, parsed };
}

function normalizeBaseUrl(value) {
  const { parsed } = validateHttpUrl(value, 'serviceUrl');

  parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

function isExplicitPlaceholder(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.startsWith('<') && trimmed.endsWith('>');
}

async function readResponseBody(response) {
  if (typeof response?.json === 'function') {
    try {
      return await response.json();
    } catch {
      // Fall back to text for non-JSON or empty responses.
    }
  }

  if (typeof response?.text === 'function') {
    return response.text();
  }

  return null;
}

/**
 * Build the argument vector for the authenticated historical Cloud Run
 * deployment pattern without executing gcloud or reading private credentials.
 */
export function buildCloudRunDeployArgs({
  serviceName,
  region = DEFAULT_REGION,
  source = DEFAULT_SOURCE,
  envVarsFile = DEFAULT_ENV_FILE,
  allowUnauthenticated = true,
} = {}) {
  if (typeof allowUnauthenticated !== 'boolean') {
    throw new TypeError('allowUnauthenticated must be a boolean');
  }

  const args = [
    'run',
    'deploy',
    requireNonEmptyString(serviceName, 'serviceName'),
    '--source',
    requireNonEmptyString(source, 'source'),
    '--region',
    requireNonEmptyString(region, 'region'),
  ];

  if (allowUnauthenticated) {
    args.push('--allow-unauthenticated');
  }

  args.push('--env-vars-file', requireNonEmptyString(envVarsFile, 'envVarsFile'));
  return args;
}

/**
 * Detect the historical failure shape where comma-delimited values were passed
 * directly through --update-env-vars. Cloud Run treats commas as separators,
 * so values such as ALLOWED_ORIGINS should travel through an env file instead.
 */
export function requiresEnvFileForValue(value) {
  return typeof value === 'string' && value.includes(',');
}

export function listEnvFileSensitiveKeys(environment = {}) {
  if (!environment || typeof environment !== 'object' || Array.isArray(environment)) {
    throw new TypeError('environment must be an object');
  }

  return Object.entries(environment)
    .filter(([, value]) => requiresEnvFileForValue(value))
    .map(([key]) => key)
    .sort();
}

/**
 * Validate the corrected historical environment-file shape before a deployment
 * plan is considered ready. Explicit angle-bracket placeholders are treated as
 * unresolved configuration rather than real secrets.
 */
export function validateCloudRunEnvironment(
  environment,
  { requiredKeys = DEFAULT_REQUIRED_ENV_KEYS } = {},
) {
  if (!environment || typeof environment !== 'object' || Array.isArray(environment)) {
    throw new TypeError('environment must be an object');
  }
  if (!Array.isArray(requiredKeys)) {
    throw new TypeError('requiredKeys must be an array');
  }

  const errors = [];
  for (const key of requiredKeys) {
    const normalizedKey = requireNonEmptyString(key, 'required environment key');
    const value = environment[normalizedKey];

    if (typeof value !== 'string' || !value.trim()) {
      errors.push(`missing required environment value: ${normalizedKey}`);
      continue;
    }

    if (isExplicitPlaceholder(value)) {
      errors.push(`unresolved placeholder environment value: ${normalizedKey}`);
    }
  }

  const envFileSensitiveKeys = listEnvFileSensitiveKeys(environment);
  return {
    valid: errors.length === 0,
    errors,
    envFileSensitiveKeys,
  };
}

/**
 * Produce credential-free request descriptors matching the historical smoke
 * test: authenticated /health followed by authenticated JSON /chat.
 */
export function buildCloudRunSmokePlan({
  serviceUrl,
  token,
  sessionId = 'smoke',
  text = 'Say hi.',
} = {}) {
  const baseUrl = normalizeBaseUrl(serviceUrl);
  const appToken = requireNonEmptyString(token, 'token');
  const normalizedSessionId = requireNonEmptyString(sessionId, 'sessionId');
  const normalizedText = requireNonEmptyString(text, 'text');
  const authHeaders = { 'x-app-token': appToken };

  return [
    {
      method: 'GET',
      url: `${baseUrl}/health`,
      headers: { ...authHeaders },
    },
    {
      method: 'POST',
      url: `${baseUrl}/chat`,
      headers: {
        ...authHeaders,
        'content-type': 'application/json',
      },
      body: {
        sessionId: normalizedSessionId,
        text: normalizedText,
      },
    },
  ];
}

/**
 * Execute an already-built smoke plan with an injected fetch implementation.
 * This preserves the historical curl behavior while keeping tests and package
 * consumers independent of live Cloud Run credentials.
 */
export async function executeCloudRunSmokePlan(plan, { fetchImpl = globalThis.fetch } = {}) {
  if (!Array.isArray(plan) || plan.length === 0) {
    throw new TypeError('plan must be a non-empty array');
  }
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('fetchImpl must be a function');
  }

  const results = [];
  for (const request of plan) {
    const method = requireNonEmptyString(request?.method, 'request method');
    const { url } = validateHttpUrl(request?.url, 'request url');
    const options = {
      method,
      headers: request.headers ? { ...request.headers } : {},
    };

    if (request.body !== undefined) {
      options.body = JSON.stringify(request.body);
    }

    let response;
    try {
      response = await fetchImpl(url, options);
    } catch (error) {
      throw new Error(`smoke request failed before response: ${method} ${url}: ${error.message}`, {
        cause: error,
      });
    }

    const result = {
      method,
      url,
      status: Number(response?.status ?? 0),
      ok: Boolean(response?.ok),
      body: await readResponseBody(response),
    };
    results.push(result);

    if (!result.ok) {
      const error = new Error(`smoke request failed: ${method} ${url} returned ${result.status}`);
      error.result = result;
      error.results = [...results];
      throw error;
    }
  }

  return results;
}

export async function runCloudRunSmokeTest({ fetchImpl, ...options } = {}) {
  return executeCloudRunSmokePlan(buildCloudRunSmokePlan(options), { fetchImpl });
}

export function createCloudRunDeploymentPlan({
  serviceName,
  serviceUrl,
  token,
  environment = {},
  region = DEFAULT_REGION,
  source = DEFAULT_SOURCE,
  envVarsFile = DEFAULT_ENV_FILE,
  allowUnauthenticated = true,
  sessionId = 'smoke',
  text = 'Say hi.',
} = {}) {
  const environmentReport = validateCloudRunEnvironment(environment);

  return {
    command: 'gcloud',
    args: buildCloudRunDeployArgs({
      serviceName,
      region,
      source,
      envVarsFile,
      allowUnauthenticated,
    }),
    environmentReport,
    envFileSensitiveKeys: environmentReport.envFileSensitiveKeys,
    smoke: buildCloudRunSmokePlan({ serviceUrl, token, sessionId, text }),
  };
}
