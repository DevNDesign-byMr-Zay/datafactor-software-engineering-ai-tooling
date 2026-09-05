import {
  buildNpmScriptPlan,
  classifyHistoricalPackageRole,
  createApplicationBootstrapPlan,
  createPackageBootstrapPlan,
  createPackageBootstrapReview,
  parsePackageManifest,
  validateModulePackage,
} from '../../src/bootstrap/package-manifest.js';

const backendManifest = {
  name: 'ai-service',
  version: '0.2.0',
  type: 'module',
  scripts: {
    start: 'node index.mjs',
    dev: 'NODE_ENV=development node index.mjs',
  },
  engines: { node: '>=18' },
};

const frontendManifest = {
  name: 'trainer-web',
  version: '0.0.1',
  private: true,
  type: 'module',
  scripts: {
    dev: 'vite',
    build: 'vite build',
    preview: 'vite preview',
  },
};

describe('package bootstrap validation', () => {
  test('parses JSON package manifests', () => {
    expect(parsePackageManifest(JSON.stringify(backendManifest))).toEqual(backendManifest);
  });

  test('rejects invalid JSON and non-object manifests', () => {
    expect(() => parsePackageManifest('{bad json')).toThrow('invalid package manifest JSON');
    expect(() => parsePackageManifest('[]')).toThrow('decode to an object');
    expect(() => parsePackageManifest(null)).toThrow('object or JSON string');
  });

  test('validates the corrected backend ESM package shape', () => {
    expect(
      validateModulePackage(backendManifest, { requiredScripts: ['start', 'dev'] }),
    ).toMatchObject({
      valid: true,
      errors: [],
      name: 'ai-service',
      type: 'module',
      nodeEngine: '>=18',
    });
  });

  test('validates the corrected frontend ESM package shape', () => {
    expect(
      validateModulePackage(frontendManifest, { requiredScripts: ['dev', 'build', 'preview'] }),
    ).toMatchObject({
      valid: true,
      errors: [],
      name: 'trainer-web',
      type: 'module',
      nodeEngine: null,
    });
  });

  test('reports missing module/bootstrap requirements without mutating the manifest', () => {
    const input = { name: 'broken', type: 'commonjs', scripts: { dev: '' } };
    const report = validateModulePackage(input, { requiredScripts: ['start', 'dev'] });

    expect(report.valid).toBe(false);
    expect(report.errors).toEqual([
      'type must be "module"',
      'missing required script: start',
      'missing required script: dev',
    ]);
    expect(input).toEqual({ name: 'broken', type: 'commonjs', scripts: { dev: '' } });
  });

  test('builds npm execution plans only for declared scripts', () => {
    expect(buildNpmScriptPlan(backendManifest, 'start')).toEqual({
      command: 'npm',
      args: ['start'],
      script: 'node index.mjs',
    });
    expect(buildNpmScriptPlan(frontendManifest, 'build')).toEqual({
      command: 'npm',
      args: ['run', 'build'],
      script: 'vite build',
    });
    expect(() => buildNpmScriptPlan(frontendManifest, 'start')).toThrow(
      'package script not found: start',
    );
  });

  test('classifies the authenticated backend and frontend manifest shapes', () => {
    expect(classifyHistoricalPackageRole(backendManifest)).toBe('backend');
    expect(classifyHistoricalPackageRole(frontendManifest)).toBe('frontend');
    expect(classifyHistoricalPackageRole({ type: 'module', scripts: {} })).toBe('unknown');
  });

  test('creates a role-aware bootstrap review', () => {
    expect(createPackageBootstrapReview(frontendManifest)).toEqual({
      role: 'frontend',
      validation: expect.objectContaining({ valid: true, name: 'trainer-web' }),
      availableScripts: ['build', 'dev', 'preview'],
    });
  });

  test('turns the corrected backend manifest into the historical install/start path', () => {
    expect(createPackageBootstrapPlan(backendManifest)).toEqual({
      packageName: 'ai-service',
      role: 'backend',
      mode: 'production',
      steps: [
        {
          phase: 'install',
          command: 'npm',
          args: ['install'],
        },
        {
          phase: 'run',
          command: 'npm',
          args: ['start'],
          script: 'node index.mjs',
        },
      ],
    });
  });

  test('turns the corrected frontend manifest into install/build production steps', () => {
    expect(createPackageBootstrapPlan(frontendManifest)).toEqual({
      packageName: 'trainer-web',
      role: 'frontend',
      mode: 'production',
      steps: [
        {
          phase: 'install',
          command: 'npm',
          args: ['install'],
        },
        {
          phase: 'build',
          command: 'npm',
          args: ['run', 'build'],
          script: 'vite build',
        },
      ],
    });
  });

  test('selects authenticated development scripts without changing install semantics', () => {
    expect(createPackageBootstrapPlan(backendManifest, { mode: 'development' })).toMatchObject({
      role: 'backend',
      mode: 'development',
      steps: [
        { phase: 'install', command: 'npm', args: ['install'] },
        {
          phase: 'run',
          command: 'npm',
          args: ['run', 'dev'],
          script: 'NODE_ENV=development node index.mjs',
        },
      ],
    });

    expect(createPackageBootstrapPlan(frontendManifest, { mode: 'development' })).toMatchObject({
      role: 'frontend',
      mode: 'development',
      steps: [
        { phase: 'install', command: 'npm', args: ['install'] },
        { phase: 'run', command: 'npm', args: ['run', 'dev'], script: 'vite' },
      ],
    });
  });

  test('builds a deterministic two-package application bootstrap plan', () => {
    expect(
      createApplicationBootstrapPlan({
        frontendManifest,
        backendManifest,
      }),
    ).toEqual({
      mode: 'production',
      frontend: expect.objectContaining({ packageName: 'trainer-web', role: 'frontend' }),
      backend: expect.objectContaining({ packageName: 'ai-service', role: 'backend' }),
      startupOrder: ['frontend:install', 'frontend:build', 'backend:install', 'backend:run'],
    });
  });

  test('uses a development startup order that starts the backend before the frontend', () => {
    expect(
      createApplicationBootstrapPlan({
        frontendManifest,
        backendManifest,
        mode: 'development',
      }).startupOrder,
    ).toEqual(['frontend:install', 'backend:install', 'backend:run', 'frontend:run']);
  });

  test('refuses malformed or unclassifiable manifests instead of inventing bootstrap behavior', () => {
    expect(() =>
      createPackageBootstrapPlan({
        name: 'broken',
        type: 'commonjs',
        scripts: { start: 'node index.js' },
      }),
    ).toThrow('package is not bootstrap-ready');

    expect(() =>
      createPackageBootstrapPlan({
        name: 'generic-module',
        type: 'module',
        scripts: {},
      }),
    ).toThrow('cannot build bootstrap plan for package role: unknown');
  });

  test('refuses swapped frontend/backend roles in an application plan', () => {
    expect(() =>
      createApplicationBootstrapPlan({
        frontendManifest: backendManifest,
        backendManifest: frontendManifest,
      }),
    ).toThrow('frontend manifest classified as backend');
  });

  test('rejects unsupported bootstrap modes', () => {
    expect(() => createPackageBootstrapPlan(backendManifest, { mode: 'staging' })).toThrow(
      'mode must be "production" or "development"',
    );
  });
});
