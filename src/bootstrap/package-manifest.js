function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireNonEmptyString(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function hasNonEmptyString(value) {
  return typeof value === 'string' && Boolean(value.trim());
}

function requiredScriptsForRole(role) {
  if (role === 'backend') return ['start', 'dev'];
  if (role === 'frontend') return ['dev', 'build', 'preview'];
  return [];
}

function selectBootstrapScript(role, mode) {
  if (!['production', 'development'].includes(mode)) {
    throw new TypeError('mode must be "production" or "development"');
  }
  if (role === 'backend') return mode === 'production' ? 'start' : 'dev';
  if (role === 'frontend') return mode === 'production' ? 'build' : 'dev';
  throw new Error(`cannot build bootstrap plan for package role: ${role}`);
}

export function parsePackageManifest(input) {
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (!isPlainObject(parsed)) {
        throw new TypeError('package manifest must decode to an object');
      }
      return parsed;
    } catch (error) {
      if (error instanceof TypeError) throw error;
      throw new SyntaxError(`invalid package manifest JSON: ${error.message}`);
    }
  }

  if (!isPlainObject(input)) {
    throw new TypeError('package manifest must be an object or JSON string');
  }

  return input;
}

export function validateModulePackage(input, { requiredScripts = [] } = {}) {
  const manifest = parsePackageManifest(input);
  const errors = [];

  if (!Array.isArray(requiredScripts)) {
    throw new TypeError('requiredScripts must be an array');
  }

  if (typeof manifest.name !== 'string' || !manifest.name.trim()) {
    errors.push('name must be a non-empty string');
  }

  if (manifest.type !== 'module') {
    errors.push('type must be "module"');
  }

  if (!isPlainObject(manifest.scripts)) {
    errors.push('scripts must be an object');
  }

  for (const scriptName of requiredScripts) {
    const normalized = requireNonEmptyString(scriptName, 'required script name');
    const command = manifest.scripts?.[normalized];
    if (typeof command !== 'string' || !command.trim()) {
      errors.push(`missing required script: ${normalized}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    name: typeof manifest.name === 'string' ? manifest.name.trim() : null,
    version: typeof manifest.version === 'string' ? manifest.version : null,
    type: manifest.type ?? null,
    scripts: isPlainObject(manifest.scripts) ? { ...manifest.scripts } : {},
    nodeEngine: typeof manifest.engines?.node === 'string' ? manifest.engines.node : null,
  };
}

export function buildNpmScriptPlan(input, scriptName) {
  const manifest = parsePackageManifest(input);
  const normalizedScriptName = requireNonEmptyString(scriptName, 'scriptName');
  const command = manifest.scripts?.[normalizedScriptName];

  if (typeof command !== 'string' || !command.trim()) {
    throw new Error(`package script not found: ${normalizedScriptName}`);
  }

  return {
    command: 'npm',
    args: normalizedScriptName === 'start' ? ['start'] : ['run', normalizedScriptName],
    script: command.trim(),
  };
}

export function classifyHistoricalPackageRole(input) {
  const manifest = parsePackageManifest(input);
  const scripts = isPlainObject(manifest.scripts) ? manifest.scripts : {};

  const hasBackendShape =
    hasNonEmptyString(scripts.start) &&
    hasNonEmptyString(scripts.dev) &&
    hasNonEmptyString(manifest.engines?.node);
  const hasFrontendShape =
    hasNonEmptyString(scripts.dev) &&
    hasNonEmptyString(scripts.build) &&
    hasNonEmptyString(scripts.preview);

  if (hasBackendShape && !hasFrontendShape) return 'backend';
  if (hasFrontendShape && !hasBackendShape) return 'frontend';
  if (hasBackendShape && hasFrontendShape) return 'hybrid';
  return 'unknown';
}

export function createPackageBootstrapReview(input) {
  const manifest = parsePackageManifest(input);
  const role = classifyHistoricalPackageRole(manifest);
  const requiredScripts = requiredScriptsForRole(role);

  return {
    role,
    validation: validateModulePackage(manifest, { requiredScripts }),
    availableScripts: Object.keys(isPlainObject(manifest.scripts) ? manifest.scripts : {}).sort(),
  };
}

/**
 * Convert a corrected historical package manifest into a deterministic bootstrap
 * sequence without executing package-manager commands. The plan deliberately
 * preserves `npm install` from the authenticated bootstrap-validation path.
 */
export function createPackageBootstrapPlan(input, { mode = 'production' } = {}) {
  const manifest = parsePackageManifest(input);
  const review = createPackageBootstrapReview(manifest);

  if (!review.validation.valid) {
    throw new Error(`package is not bootstrap-ready: ${review.validation.errors.join('; ')}`);
  }

  const scriptName = selectBootstrapScript(review.role, mode);
  return {
    packageName: review.validation.name,
    role: review.role,
    mode,
    steps: [
      {
        phase: 'install',
        command: 'npm',
        args: ['install'],
      },
      {
        phase: mode === 'production' && review.role === 'frontend' ? 'build' : 'run',
        ...buildNpmScriptPlan(manifest, scriptName),
      },
    ],
  };
}

export function createApplicationBootstrapPlan({
  frontendManifest,
  backendManifest,
  mode = 'production',
} = {}) {
  const frontend = createPackageBootstrapPlan(frontendManifest, { mode });
  const backend = createPackageBootstrapPlan(backendManifest, { mode });

  if (frontend.role !== 'frontend') {
    throw new Error(`frontend manifest classified as ${frontend.role}`);
  }
  if (backend.role !== 'backend') {
    throw new Error(`backend manifest classified as ${backend.role}`);
  }

  return {
    mode,
    frontend,
    backend,
    startupOrder:
      mode === 'production'
        ? ['frontend:install', 'frontend:build', 'backend:install', 'backend:run']
        : ['frontend:install', 'backend:install', 'backend:run', 'frontend:run'],
  };
}
