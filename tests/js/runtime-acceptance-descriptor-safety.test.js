import {
  buildRuntimeAcceptanceReceipt,
  serializeRuntimeAcceptanceReceipt,
} from '../../src/runtime/runtime-acceptance-receipt.js';
import {
  decideRuntimeAcceptanceChange,
  RUNTIME_ACCEPTANCE_DECISIONS,
} from '../../src/runtime/runtime-acceptance-decision.js';

function acceptance() {
  return {
    accepted: true,
    bootstrap: {
      stage: 'readiness',
      readiness: [{ name: 'health', status: 'ready' }],
    },
    release: {
      stage: 'revision-inspect',
      exitCode: 0,
      service: {
        serviceName: 'roary-api',
        latestReadyRevisionName: 'roary-api-00042-abc',
        traffic: [
          {
            revisionName: 'roary-api-00042-abc',
            percent: 100,
            tag: null,
            url: null,
          },
        ],
        url: null,
      },
    },
  };
}

describe('runtime acceptance descriptor safety', () => {
  test('builder rejects an accessor-backed acceptance input without executing it', () => {
    let getterReads = 0;
    const input = {};
    Object.defineProperty(input, 'acceptance', {
      enumerable: true,
      get() {
        getterReads += 1;
        return acceptance();
      },
    });

    expect(() => buildRuntimeAcceptanceReceipt(input)).toThrow(/must not use accessors/);
    expect(getterReads).toBe(0);
  });

  test('builder rejects nested trusted accessors without executing them', () => {
    const source = acceptance();
    let getterReads = 0;
    Object.defineProperty(source.release, 'service', {
      enumerable: true,
      configurable: true,
      get() {
        getterReads += 1;
        return acceptance().release.service;
      },
    });

    expect(() => buildRuntimeAcceptanceReceipt({ acceptance: source })).toThrow(
      /acceptance\.release\.service must not use accessors/,
    );
    expect(getterReads).toBe(0);
  });

  test('builder ignores irrelevant provider diagnostics without evaluating getters', () => {
    const source = acceptance();
    let getterReads = 0;
    Object.defineProperty(source.release, 'stdout', {
      enumerable: true,
      get() {
        getterReads += 1;
        return 'sensitive provider output';
      },
    });

    const receipt = buildRuntimeAcceptanceReceipt({ acceptance: source });
    expect(receipt.accepted).toBe(true);
    expect(getterReads).toBe(0);
  });

  test('serialization rejects trusted receipt accessors without executing them', () => {
    const receipt = buildRuntimeAcceptanceReceipt({ acceptance: acceptance() });
    const deceptive = { ...receipt };
    let getterReads = 0;
    Object.defineProperty(deceptive, 'service', {
      enumerable: true,
      configurable: true,
      get() {
        getterReads += 1;
        return receipt.service;
      },
    });

    expect(() => serializeRuntimeAcceptanceReceipt(deceptive)).toThrow(/must not use accessors/);
    expect(getterReads).toBe(0);
  });

  test('serialization rejects prototype-backed receipts', () => {
    const receipt = buildRuntimeAcceptanceReceipt({ acceptance: acceptance() });
    const prototypeBacked = Object.assign(Object.create({ inherited: true }), receipt);

    expect(() => serializeRuntimeAcceptanceReceipt(prototypeBacked)).toThrow(/plain object/);
  });

  test('serialization rejects accessor-backed traffic arrays without executing entries', () => {
    const receipt = buildRuntimeAcceptanceReceipt({ acceptance: acceptance() });
    const traffic = new Array(1);
    let getterReads = 0;
    Object.defineProperty(traffic, '0', {
      enumerable: true,
      configurable: true,
      get() {
        getterReads += 1;
        return receipt.service.traffic[0];
      },
    });
    const deceptive = {
      ...receipt,
      service: { ...receipt.service, traffic },
    };

    expect(() => serializeRuntimeAcceptanceReceipt(deceptive)).toThrow(/enumerable data/);
    expect(getterReads).toBe(0);
  });

  test('consumer rejects an accessor-backed accepted marker without executing it', () => {
    let getterReads = 0;
    const deceptive = {};
    Object.defineProperty(deceptive, 'accepted', {
      enumerable: true,
      get() {
        getterReads += 1;
        return true;
      },
    });

    expect(() => decideRuntimeAcceptanceChange(deceptive, undefined)).toThrow(
      /accepted must not use accessors/,
    );
    expect(getterReads).toBe(0);
  });

  test('consumer keeps rejected evidence outside the trusted sequence without reading nested data', () => {
    let getterReads = 0;
    const rejected = { accepted: false };
    Object.defineProperty(rejected, 'service', {
      enumerable: true,
      get() {
        getterReads += 1;
        return { name: 'should-not-be-read' };
      },
    });

    expect(decideRuntimeAcceptanceChange(rejected, 'trusted-fingerprint')).toBe(
      RUNTIME_ACCEPTANCE_DECISIONS.REJECTED,
    );
    expect(getterReads).toBe(0);
  });
});
