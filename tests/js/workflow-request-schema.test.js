import { describe, expect, test } from '@jest/globals';
import {
  workflowRequestSchema,
  WorkflowValidationError,
} from '../../src/api/workflow-request-schema.js';
import { createWorkbenchServer as companion } from '../../apps/aetherforge-workbench/server.mjs';
import { createWorkbenchServer as commercial } from '../../apps/aetherforge-commercial/server.mjs';

const validCases = [
  { action: 'cloud', inputs: { serviceName: 'aetherforge-example', region: 'us-central1' } },
  { action: 'brush', inputs: { brushSize: '48', distance: '90', feather: '10', shape: 'circle' } },
  {
    action: 'holo',
    inputs: {
      snapshotId: 'design-001',
      provenanceRef: 'user-provided-01',
      intent: 'Inspect reference',
    },
  },
  {
    action: 'energy',
    inputs: { durationMs: 100, estimatedEnergyWh: '14.5', renewableRatio: '0.5' },
  },
  { action: 'receipt', inputs: { receipt: {}, receiptFingerprint: 'a'.repeat(64) } },
];

describe('schema-validated workflow API boundary', () => {
  test.each(validCases)('accepts maintained $action workflow shape', (value) => {
    const result = workflowRequestSchema.safeParse(value);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(value);
    expect(Object.isFrozen(result.data)).toBe(true);
    expect(Object.isFrozen(result.data.inputs)).toBe(true);
  });
  test.each([
    null,
    [],
    {},
    { action: 'unknown', inputs: {} },
    { action: 'cloud', inputs: { serviceName: '' } },
    { action: 'cloud', inputs: { serviceName: 'x', accessToken: 'do-not-copy' } },
    {
      action: 'brush',
      inputs: { brushSize: 'Infinity', distance: 1, feather: 2, shape: 'circle' },
    },
    { action: 'brush', inputs: { brushSize: 'abc', distance: 1, feather: 2, shape: 'circle' } },
    { action: 'holo', inputs: { snapshotId: 'x', provenanceRef: 'x' } },
    { action: 'energy', inputs: { durationMs: {}, estimatedEnergyWh: 1, renewableRatio: 0 } },
    { action: 'cloud', inputs: { serviceName: 'safe' }, extra: 'secret' },
    { action: 'receipt', inputs: { receipt: [], receiptFingerprint: 'hash' } },
    Object.assign(Object.create(null), {
      action: 'cloud',
      inputs: { serviceName: 'x', region: 'us-east1', unexpected: true },
    }),
  ])('fails closed for invalid payload %#', (body) => {
    const result = workflowRequestSchema.safeParse(body);
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(WorkflowValidationError);
    expect(result.error.statusCode).toBe(422);
    expect(() => workflowRequestSchema.parse(body)).toThrow('Invalid workflow input');
  });
  test.each([
    {
      action: 'brush',
      inputs: { brushSize: '+2.5', distance: '1e2', feather: '.75', shape: 'circle' },
    },
    {
      action: 'energy',
      inputs: { durationMs: ' 120.5 ', estimatedEnergyWh: '0.25', renewableRatio: '-0' },
    },
  ])('accepts bounded decimal strings without coercion for $action', (body) => {
    const result = workflowRequestSchema.safeParse(body);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(body);
  });

  test.each(['0x10', '0b101', '0o77', '1_000', '1e999', '1'.repeat(65), '+', '.'])(
    'rejects nondecimal or unbounded numeric string %s',
    (value) => {
      const body = {
        action: 'brush',
        inputs: { brushSize: value, distance: 10, feather: 2, shape: 'circle' },
      };
      const result = workflowRequestSchema.safeParse(body);
      expect(result.success).toBe(false);
      expect(result.error.statusCode).toBe(422);
    },
  );

  test('rejects accessor properties without running them', () => {
    let invoked = false;
    const payload = { action: 'cloud', inputs: {} };
    Object.defineProperty(payload.inputs, 'serviceName', {
      enumerable: true,
      get() {
        invoked = true;
        return 'bad';
      },
    });
    expect(workflowRequestSchema.safeParse(payload).success).toBe(false);
    expect(invoked).toBe(false);
  });
  test.each([
    ['Companion', companion],
    ['Commercial', commercial],
  ])('%s enforces schema at live POST /api/run', async (_name, createServer) => {
    const server = createServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const endpoint = 'http://127.0.0.1:' + server.address().port + '/api/run';
    try {
      const rejected = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'cloud', inputs: { serviceName: 12 } }),
      });
      expect(rejected.status).toBe(422);
      expect(await rejected.json()).toEqual({
        error: 'Invalid workflow input. Review the required fields.',
      });
      const nonDecimal = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'energy',
          inputs: { durationMs: '0x10', estimatedEnergyWh: '14', renewableRatio: '0.5' },
        }),
      });
      expect(nonDecimal.status).toBe(422);
      expect(await nonDecimal.json()).toEqual({
        error: 'Invalid workflow input. Review the required fields.',
      });
      const good = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(validCases[1]),
      });
      expect(good.status).toBe(200);
      expect((await good.json()).status).toBe('computed');
    } finally {
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
  test('converts hostile reflection traps into the same 422 validation response', () => {
    let trapCalls = 0;
    const failReflection = () => {
      trapCalls += 1;
      throw new Error('private reflection failure');
    };
    const safeInputs = { serviceName: 'aetherforge' };
    const candidates = [
      new Proxy({ action: 'cloud', inputs: safeInputs }, { getPrototypeOf: failReflection }),
      new Proxy({ action: 'cloud', inputs: safeInputs }, { ownKeys: failReflection }),
      { action: 'cloud', inputs: new Proxy(safeInputs, { ownKeys: failReflection }) },
      {
        action: 'receipt',
        inputs: {
          receipt: new Proxy({}, { getPrototypeOf: failReflection }),
          receiptFingerprint: 'a'.repeat(64),
        },
      },
    ];

    for (const candidate of candidates) {
      const result = workflowRequestSchema.safeParse(candidate);
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(WorkflowValidationError);
      expect(result.error.statusCode).toBe(422);
      expect(result.error.message).not.toContain('private reflection failure');
    }
    expect(trapCalls).toBe(4);
  });

  test('rejects non-JSON property descriptors and symbols without executing accessors', () => {
    let getterCalls = 0;
    const withNonEnumerableBodyField = { action: 'cloud', inputs: { serviceName: 'safe' } };
    Object.defineProperty(withNonEnumerableBodyField, 'hidden', {
      value: 'untrusted',
      enumerable: false,
    });

    const withNonEnumerableInput = { action: 'cloud', inputs: {} };
    Object.defineProperty(withNonEnumerableInput.inputs, 'serviceName', {
      value: 'untrusted',
      enumerable: false,
    });

    const withAccessor = { action: 'cloud', inputs: { serviceName: 'safe' } };
    Object.defineProperty(withAccessor, 'action', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'cloud';
      },
    });

    const withSymbol = {
      action: 'cloud',
      inputs: { serviceName: 'safe', [Symbol('unexpected')]: true },
    };

    for (const candidate of [
      withNonEnumerableBodyField,
      withNonEnumerableInput,
      withAccessor,
      withSymbol,
    ]) {
      expect(workflowRequestSchema.safeParse(candidate).error).toBeInstanceOf(
        WorkflowValidationError,
      );
    }
    expect(getterCalls).toBe(0);
  });

});
