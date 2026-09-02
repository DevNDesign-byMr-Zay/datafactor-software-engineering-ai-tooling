import * as library from '../../src/index.js';

describe('canonical package entrypoint', () => {
  test('exposes maintained canonical and promoted APIs', () => {
    expect(typeof library.clampBrushSize).toBe('function');
    expect(typeof library.computeStrokeSteps).toBe('function');
    expect(typeof library.parseAllowedOrigins).toBe('function');
    expect(typeof library.healthSnapshot).toBe('function');
    expect(typeof library.createAdaptiveDurationProgressController).toBe('function');
    expect(typeof library.createTokenAuthMiddleware).toBe('function');
    expect(typeof library.createCorsPolicy).toBe('function');
  });

  test('routes behavior through the public package surface', () => {
    expect(library.clampBrushSize(999)).toBe(220);
    expect(library.parseAllowedOrigins('https://a.example, https://b.example')).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
    expect(library.healthSnapshot()).toMatchObject({
      ok: true,
      location: 'us-central1',
      project: null,
      bucket: null,
    });
  });
});
