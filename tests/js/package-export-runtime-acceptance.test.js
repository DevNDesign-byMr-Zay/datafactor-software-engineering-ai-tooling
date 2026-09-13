import * as runtime from '../../src/index.js';

describe('runtime acceptance package exports', () => {
  test('exposes the consumer observation helpers from the package root', () => {
    expect(runtime.buildRuntimeAcceptanceObservation).toEqual(expect.any(Function));
    expect(runtime.explainRuntimeAcceptanceDiff).toEqual(expect.any(Function));
    expect(runtime.summarizeRuntimeAcceptanceExplanation).toEqual(expect.any(Function));
  });
});
