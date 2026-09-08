import { validateModulePackage } from '../../src/bootstrap/package-manifest.js';

describe('package manifest boundary validation', () => {
  test('rejects non-array required script configuration', () => {
    expect(() =>
      validateModulePackage(
        {
          name: 'service',
          type: 'module',
          scripts: { start: 'node index.mjs' },
        },
        { requiredScripts: 'start' },
      ),
    ).toThrow('requiredScripts must be an array');
  });
});
