import {
  createSustainabilityEvidenceBundle,
  validateSustainabilityEvidenceBundle,
} from '../../src/sustainability/evidence-bundle.js';

const validInputs = () => ({
  receipt: { estimatedEnergyWh: 4, runtime: { id: 'run-1' } },
  metadata: { source: 'runtime', tags: ['reviewed'] },
  efficiency: { energyPerSecondWh: 2 },
});

describe('sustainability evidence serializer boundary', () => {
  test.each([
    ['NaN', Number.NaN],
    ['positive infinity', Number.POSITIVE_INFINITY],
    ['negative infinity', Number.NEGATIVE_INFINITY],
  ])('rejects %s nested numeric evidence', (_label, value) => {
    expect(() =>
      createSustainabilityEvidenceBundle({
        ...validInputs(),
        metadata: { source: 'runtime', measurements: { value } },
      }),
    ).toThrow(/numbers must be finite/);
  });

  test('rejects custom prototypes before accepting inherited state', () => {
    const prototype = { inherited: 'must-not-cross-boundary' };
    const receipt = Object.assign(Object.create(prototype), { estimatedEnergyWh: 4 });

    expect(() =>
      createSustainabilityEvidenceBundle({
        ...validInputs(),
        receipt,
      }),
    ).toThrow(/must use plain objects/);
  });

  test('deeply snapshots nested arrays so caller mutation cannot rewrite issued evidence', () => {
    const nested = [{ values: ['before'] }];
    const inputs = validInputs();
    inputs.metadata = { source: 'runtime', nested };

    const bundle = createSustainabilityEvidenceBundle(inputs);
    nested[0].values[0] = 'after';
    nested.push({ values: ['late'] });

    expect(bundle.metadata.nested).toEqual([{ values: ['before'] }]);
    expect(Object.isFrozen(bundle.metadata.nested)).toBe(true);
    expect(Object.isFrozen(bundle.metadata.nested[0].values)).toBe(true);
    expect(validateSustainabilityEvidenceBundle(bundle)).toBe(true);
  });

  test('allows repeated shared references while preserving independent snapshots', () => {
    const shared = { id: 'shared' };
    const inputs = validInputs();
    inputs.receipt = { first: shared, second: shared };

    const bundle = createSustainabilityEvidenceBundle(inputs);

    expect(bundle.receipt.first).toEqual({ id: 'shared' });
    expect(bundle.receipt.second).toEqual({ id: 'shared' });
    expect(bundle.receipt.first).not.toBe(bundle.receipt.second);
    expect(bundle.receipt.first).not.toBe(shared);
  });

  test('rejects circular evidence without evaluating the cycle', () => {
    const metadata = { source: 'runtime' };
    metadata.self = metadata;

    expect(() =>
      createSustainabilityEvidenceBundle({
        ...validInputs(),
        metadata,
      }),
    ).toThrow(/must not contain circular references/);
  });

  test('rejects array properties and accessors without evaluating executable evidence', () => {
    const values = ['safe'];
    values.extra = 'unexpected';
    expect(() =>
      createSustainabilityEvidenceBundle({
        ...validInputs(),
        metadata: { source: 'runtime', values },
      }),
    ).toThrow(/arrays must not contain extra properties/);

    let reads = 0;
    const metadata = { source: 'runtime' };
    Object.defineProperty(metadata, 'computed', {
      enumerable: true,
      get() {
        reads += 1;
        return 'unsafe';
      },
    });

    expect(() =>
      createSustainabilityEvidenceBundle({
        ...validInputs(),
        metadata,
      }),
    ).toThrow(/must not use accessors/);
    expect(reads).toBe(0);
  });

  test('rejects non-enumerable evidence properties before issuing a bundle', () => {
    const metadata = { source: 'runtime' };
    Object.defineProperty(metadata, 'hidden', {
      configurable: true,
      enumerable: false,
      value: 'must-not-cross-boundary',
      writable: true,
    });

    expect(() =>
      createSustainabilityEvidenceBundle({
        ...validInputs(),
        metadata,
      }),
    ).toThrow(/must be enumerable evidence/);
  });

  test('validator fails closed when nested trusted evidence is replaced by a custom prototype', () => {
    const bundle = createSustainabilityEvidenceBundle(validInputs());
    const tampered = {
      ...bundle,
      metadata: Object.assign(Object.create({ inherited: true }), bundle.metadata),
    };

    expect(validateSustainabilityEvidenceBundle(tampered)).toBe(false);
  });

  test('validator fails closed when the trusted bundle gains a symbol property', () => {
    const bundle = createSustainabilityEvidenceBundle(validInputs());
    const tampered = { ...bundle };
    tampered[Symbol('hidden')] = 'unexpected';

    expect(validateSustainabilityEvidenceBundle(tampered)).toBe(false);
  });

  test('validator fails closed when nested trusted evidence gains non-enumerable state', () => {
    const bundle = createSustainabilityEvidenceBundle(validInputs());
    const metadata = { ...bundle.metadata };
    Object.defineProperty(metadata, 'hidden', {
      configurable: true,
      enumerable: false,
      value: 'unexpected',
      writable: true,
    });
    const tampered = { ...bundle, metadata };

    expect(validateSustainabilityEvidenceBundle(tampered)).toBe(false);
  });
});
