import { consumeRuntimeAcceptanceEvidence } from '../../src/runtime/runtime-acceptance-consumer.js';
import { RUNTIME_ACCEPTANCE_DECISIONS } from '../../src/runtime/runtime-acceptance-decision.js';
import {
  fingerprintRuntimeAcceptanceReceipt,
  serializeRuntimeAcceptanceReceipt,
} from '../../src/runtime/runtime-acceptance-receipt.js';
import { runtimeAcceptanceConsumerFixture } from './fixtures/runtime-acceptance-consumer.js';

function fingerprint() {
  return fingerprintRuntimeAcceptanceReceipt(runtimeAcceptanceConsumerFixture);
}

function differentFingerprint(value) {
  const replacement = value.startsWith('0') ? '1' : '0';
  return `${replacement}${value.slice(1)}`;
}

describe('verified runtime acceptance consumer boundary', () => {
  test('classifies a verified first trusted receipt as changed', () => {
    const receiptFingerprint = fingerprint();
    const result = consumeRuntimeAcceptanceEvidence({
      receipt: runtimeAcceptanceConsumerFixture,
      receiptFingerprint,
    });

    expect(result).toEqual({
      status: RUNTIME_ACCEPTANCE_DECISIONS.CHANGED,
      fingerprint: receiptFingerprint,
      reason: null,
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  test('classifies the same verified receipt as unchanged', () => {
    const receiptFingerprint = fingerprint();
    expect(
      consumeRuntimeAcceptanceEvidence({
        receipt: runtimeAcceptanceConsumerFixture,
        receiptFingerprint,
        previousFingerprint: receiptFingerprint,
      }),
    ).toEqual({
      status: RUNTIME_ACCEPTANCE_DECISIONS.UNCHANGED,
      fingerprint: receiptFingerprint,
      reason: null,
    });
  });

  test('rejects a supplied fingerprint that does not match the current receipt', () => {
    const receiptFingerprint = fingerprint();
    expect(
      consumeRuntimeAcceptanceEvidence({
        receipt: runtimeAcceptanceConsumerFixture,
        receiptFingerprint: differentFingerprint(receiptFingerprint),
      }),
    ).toEqual({
      status: RUNTIME_ACCEPTANCE_DECISIONS.REJECTED,
      fingerprint: null,
      reason: 'receipt fingerprint mismatch',
    });
  });

  test('rejects malformed previous fingerprint input instead of treating it as a change', () => {
    expect(
      consumeRuntimeAcceptanceEvidence({
        receipt: runtimeAcceptanceConsumerFixture,
        receiptFingerprint: fingerprint(),
        previousFingerprint: 'not-a-sha256-fingerprint',
      }),
    ).toEqual({
      status: RUNTIME_ACCEPTANCE_DECISIONS.REJECTED,
      fingerprint: null,
      reason: 'invalid previous fingerprint',
    });
  });

  test('rejects failed acceptance without evaluating nested diagnostics', () => {
    let releaseReads = 0;
    const receipt = { accepted: false };
    Object.defineProperty(receipt, 'release', {
      enumerable: true,
      get() {
        releaseReads += 1;
        throw new Error('must remain unread');
      },
    });

    expect(
      consumeRuntimeAcceptanceEvidence({
        receipt,
        receiptFingerprint: 'a'.repeat(64),
      }),
    ).toEqual({
      status: RUNTIME_ACCEPTANCE_DECISIONS.REJECTED,
      fingerprint: null,
      reason: 'acceptance rejected',
    });
    expect(releaseReads).toBe(0);
  });

  test('rejects top-level consumer accessors without evaluating them', () => {
    let receiptReads = 0;
    const input = {
      receiptFingerprint: fingerprint(),
    };
    Object.defineProperty(input, 'receipt', {
      enumerable: true,
      get() {
        receiptReads += 1;
        return runtimeAcceptanceConsumerFixture;
      },
    });

    expect(consumeRuntimeAcceptanceEvidence(input)).toEqual({
      status: RUNTIME_ACCEPTANCE_DECISIONS.REJECTED,
      fingerprint: null,
      reason: 'invalid consumer input',
    });
    expect(receiptReads).toBe(0);
  });

  test('rejects symbols, unsupported envelope fields, and receipt diagnostics', () => {
    const symbolic = {
      receipt: runtimeAcceptanceConsumerFixture,
      receiptFingerprint: fingerprint(),
    };
    symbolic[Symbol('hidden')] = true;
    expect(consumeRuntimeAcceptanceEvidence(symbolic).reason).toBe('invalid consumer input');

    expect(
      consumeRuntimeAcceptanceEvidence({
        receipt: runtimeAcceptanceConsumerFixture,
        receiptFingerprint: fingerprint(),
        release: { stdout: 'outside durable evidence' },
      }).reason,
    ).toBe('invalid consumer input');

    expect(
      consumeRuntimeAcceptanceEvidence({
        receipt: { ...runtimeAcceptanceConsumerFixture, stdout: 'provider output' },
        receiptFingerprint: fingerprint(),
      }).reason,
    ).toBe('invalid receipt');
  });

  test('keeps the maintained fixture compact, order-stable, and provider-noise-free', () => {
    const serialized = serializeRuntimeAcceptanceReceipt(runtimeAcceptanceConsumerFixture);
    for (const diagnosticField of [
      'stdout',
      'stderr',
      'command',
      'args',
      'token',
      'environment',
      'release',
    ]) {
      expect(serialized).not.toContain(`"${diagnosticField}"`);
    }

    const equivalent = {
      ...runtimeAcceptanceConsumerFixture,
      service: {
        ...runtimeAcceptanceConsumerFixture.service,
        traffic: [...runtimeAcceptanceConsumerFixture.service.traffic].reverse(),
      },
    };
    expect(fingerprintRuntimeAcceptanceReceipt(equivalent)).toBe(fingerprint());
  });
});
