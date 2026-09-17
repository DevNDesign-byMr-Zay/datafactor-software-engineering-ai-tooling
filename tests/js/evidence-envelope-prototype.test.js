import { describe, expect, it } from '@jest/globals';
import {
  buildHolographicEvidenceEnvelope,
  validateHolographicEvidenceEnvelope,
} from '../../src/holographic/evidence-envelope.js';

describe('holographic evidence envelope prototype boundary', () => {
  it('rejects evidence safety inherited from a prototype', () => {
    const envelope = buildHolographicEvidenceEnvelope({
      snapshotId: 'snap-proto',
      sceneId: 'scene-proto',
      provenanceRef: 'prov-proto',
      target: 'holo-mat',
    });
    const forgedSafety = Object.create(envelope.safety);
    const forgedEnvelope = { ...envelope, safety: forgedSafety };

    expect(validateHolographicEvidenceEnvelope(forgedEnvelope)).toBe(false);
  });

  it('rejects evidence envelope fields inherited from a prototype', () => {
    const envelope = buildHolographicEvidenceEnvelope({
      snapshotId: 'snap-fields',
      sceneId: 'scene-fields',
      provenanceRef: 'prov-fields',
      target: 'holo-mat',
    });
    const prototype = Object.fromEntries(
      Object.entries(envelope).filter(([key]) => key !== 'sceneId'),
    );
    const forgedEnvelope = Object.assign(Object.create(prototype), { sceneId: envelope.sceneId });
    delete forgedEnvelope.sceneId;

    expect(validateHolographicEvidenceEnvelope(forgedEnvelope)).toBe(false);
  });

  it('rejects an own prototype-named envelope field instead of dropping it', () => {
    const envelope = buildHolographicEvidenceEnvelope({
      snapshotId: 'snap-proto-name',
      sceneId: 'scene-proto-name',
      provenanceRef: 'prov-proto-name',
      target: 'holo-mat',
    });
    const prototypeNamed = JSON.parse('{"__proto__":{"hiddenAuthority":true}}');
    const forgedEnvelope = { ...envelope, ...prototypeNamed };

    expect(Object.hasOwn(forgedEnvelope, '__proto__')).toBe(true);
    expect(validateHolographicEvidenceEnvelope(forgedEnvelope)).toBe(false);
  });

  it('preserves prototype-named payload evidence inside the signed fingerprint', () => {
    const prototypeNamed = JSON.parse('{"__proto__":{"reviewed":true}}');
    const envelope = buildHolographicEvidenceEnvelope({
      snapshotId: 'snap-payload-proto-name',
      sceneId: 'scene-payload-proto-name',
      provenanceRef: 'prov-payload-proto-name',
      target: 'holo-mat',
      payload: { status: 'reviewed', ...prototypeNamed },
    });

    expect(Object.hasOwn(envelope.payload, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(envelope.payload)).toBe(Object.prototype);
    expect(validateHolographicEvidenceEnvelope(envelope)).toBe(true);

    const tampered = JSON.parse(JSON.stringify(envelope));
    tampered.payload.__proto__.reviewed = false;
    expect(validateHolographicEvidenceEnvelope(tampered)).toBe(false);
  });

  it('rejects top-level and safety accessors without evaluating getters', () => {
    const envelope = buildHolographicEvidenceEnvelope({
      snapshotId: 'snap-accessor',
      sceneId: 'scene-accessor',
      provenanceRef: 'prov-accessor',
      target: 'holo-mat',
    });
    let envelopeGetterReads = 0;
    let safetyGetterReads = 0;

    const deceptiveEnvelope = { ...envelope };
    Object.defineProperty(deceptiveEnvelope, 'fingerprint', {
      enumerable: true,
      get() {
        envelopeGetterReads += 1;
        return envelope.fingerprint;
      },
    });
    expect(validateHolographicEvidenceEnvelope(deceptiveEnvelope)).toBe(false);
    expect(envelopeGetterReads).toBe(0);

    const deceptiveSafety = { ...envelope.safety };
    Object.defineProperty(deceptiveSafety, 'authoritative', {
      enumerable: true,
      get() {
        safetyGetterReads += 1;
        return false;
      },
    });
    expect(validateHolographicEvidenceEnvelope({ ...envelope, safety: deceptiveSafety })).toBe(
      false,
    );
    expect(safetyGetterReads).toBe(0);
  });

  it('rejects nested payload accessors without evaluating getters', () => {
    const envelope = buildHolographicEvidenceEnvelope({
      snapshotId: 'snap-payload',
      sceneId: 'scene-payload',
      provenanceRef: 'prov-payload',
      target: 'holo-mat',
      payload: { status: 'reviewed' },
    });
    let getterReads = 0;
    const payload = { status: 'reviewed' };
    Object.defineProperty(payload, 'dynamic', {
      enumerable: true,
      get() {
        getterReads += 1;
        return 'unsafe';
      },
    });

    expect(validateHolographicEvidenceEnvelope({ ...envelope, payload })).toBe(false);
    expect(getterReads).toBe(0);
  });

  it('rejects hidden, symbolic, and decorated evidence side channels', () => {
    const envelope = buildHolographicEvidenceEnvelope({
      snapshotId: 'snap-side-channel',
      sceneId: 'scene-side-channel',
      provenanceRef: 'prov-side-channel',
      target: 'holo-mat',
      payload: ['reviewed'],
    });

    const hidden = { ...envelope };
    Object.defineProperty(hidden, 'authority', { enumerable: false, value: true });
    expect(validateHolographicEvidenceEnvelope(hidden)).toBe(false);

    const symbolic = { ...envelope };
    symbolic[Symbol('authority')] = true;
    expect(validateHolographicEvidenceEnvelope(symbolic)).toBe(false);

    const payload = ['reviewed'];
    payload.shadowAuthority = true;
    expect(validateHolographicEvidenceEnvelope({ ...envelope, payload })).toBe(false);
  });

  it('captures payload evidence without executing accessors during construction', () => {
    let getterReads = 0;
    const payload = { status: 'reviewed' };
    Object.defineProperty(payload, 'dynamic', {
      enumerable: true,
      get() {
        getterReads += 1;
        return 'unsafe';
      },
    });

    expect(() =>
      buildHolographicEvidenceEnvelope({
        snapshotId: 'snap-build-accessor',
        sceneId: 'scene-build-accessor',
        provenanceRef: 'prov-build-accessor',
        target: 'holo-mat',
        payload,
      }),
    ).toThrow(/must not use accessors/);
    expect(getterReads).toBe(0);
  });

  it('captures build inputs before evaluating getters or unsupported fields', () => {
    let getterReads = 0;
    const input = {
      sceneId: 'scene-build-input',
      provenanceRef: 'prov-build-input',
      target: 'holo-mat',
    };
    Object.defineProperty(input, 'snapshotId', {
      enumerable: true,
      get() {
        getterReads += 1;
        return 'snap-build-input';
      },
    });

    expect(() => buildHolographicEvidenceEnvelope(input)).toThrow(/must not use accessors/);
    expect(getterReads).toBe(0);

    const prototypeNamed = JSON.parse('{"__proto__":{"hiddenAuthority":true}}');
    expect(() =>
      buildHolographicEvidenceEnvelope({
        snapshotId: 'snap-build-proto-name',
        sceneId: 'scene-build-proto-name',
        provenanceRef: 'prov-build-proto-name',
        target: 'holo-mat',
        ...prototypeNamed,
      }),
    ).toThrow(/unsupported field: __proto__/);
  });
});
