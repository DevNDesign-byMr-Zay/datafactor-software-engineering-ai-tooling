import {
  classifyHistoricalPackageRole,
  createPackageBootstrapPlan,
} from '../../src/bootstrap/package-manifest.js';

describe('historical package role classification safety', () => {
  test.each([
    {
      name: 'blank backend start script',
      manifest: {
        name: 'ai-service',
        type: 'module',
        scripts: { start: '   ', dev: 'node index.mjs' },
        engines: { node: '>=18' },
      },
    },
    {
      name: 'blank backend Node engine',
      manifest: {
        name: 'ai-service',
        type: 'module',
        scripts: { start: 'node index.mjs', dev: 'node index.mjs' },
        engines: { node: '   ' },
      },
    },
    {
      name: 'blank frontend build script',
      manifest: {
        name: 'trainer-web',
        type: 'module',
        scripts: { dev: 'vite', build: '', preview: 'vite preview' },
      },
    },
  ])('does not classify $name as a usable package role', ({ manifest }) => {
    expect(classifyHistoricalPackageRole(manifest)).toBe('unknown');
    expect(() => createPackageBootstrapPlan(manifest)).toThrow(
      'cannot build bootstrap plan for package role: unknown',
    );
  });
});
