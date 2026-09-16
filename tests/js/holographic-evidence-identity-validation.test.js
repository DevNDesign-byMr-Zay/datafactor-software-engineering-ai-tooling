import { createHash } from 'node:crypto';
import {
  buildHolographicEvidenceEnvelope,
  validateHolographicEvidenceEnvelope,
} from '../../src/index.js';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function refingerprint(envelope, change) {
  const value = { ...envelope, ...change };
  const unsigned = {
    envelopeVersion: value.envelopeVersion,
    snapshotId: value.snapshotId,
    sceneId: value.sceneId,
    provenanceRef: value.provenanceRef,
    target: value.target,
    renderer: value.renderer,
    payload: value.payload,
    advisoryOnly: value.advisoryOnly,
  };
  value.fingerprint = createHash('sha256')
    .update(JSON.stringify(canonical(unsigned)), 'utf8')
    .digest('hex');
  return value;
}

describe('holographic evidence identity validation', () => {
  const valid = buildHolographicEvidenceEnvelope({
    snapshotId: 'snapshot-1',
    sceneId: 'scene-1',
    provenanceRef: 'receipt-1',
    renderer: 'renderer-neutral',
  });

  test.each([
    ['snapshotId', ''],
    ['sceneId', '   '],
    ['provenanceRef', ' receipt-1 '],
    ['renderer', ''],
    ['renderer', ' renderer-neutral '],
  ])('rejects re-fingerprinted noncanonical %s', (field, value) => {
    expect(validateHolographicEvidenceEnvelope(refingerprint(valid, { [field]: value }))).toBe(
      false,
    );
  });
});
