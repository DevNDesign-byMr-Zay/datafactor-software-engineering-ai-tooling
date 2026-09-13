import {
  buildHolographicEvidenceEnvelope,
  validateHolographicEvidenceEnvelope,
} from '../../src/holographic/evidence-envelope.js';

describe('holographic evidence envelope', () => {
  const input = {
    snapshotId: 'snapshot-001',
    sceneId: 'scene-001',
    provenanceRef: 'receipt-001',
    target: 'holo-mat',
    payload: { mode: 'attention' },
  };

  test('binds renderer output to snapshot and provenance evidence', () => {
    const envelope = buildHolographicEvidenceEnvelope(input);
    expect(envelope.snapshotId).toBe('snapshot-001');
    expect(envelope.sceneId).toBe('scene-001');
    expect(envelope.provenanceRef).toBe('receipt-001');
    expect(envelope.advisoryOnly).toBe(true);
    expect(envelope.safety.authoritative).toBe(false);
    expect(validateHolographicEvidenceEnvelope(envelope)).toBe(true);
  });

  test('fingerprint is deterministic for equivalent payloads', () => {
    const first = buildHolographicEvidenceEnvelope(input);
    const second = buildHolographicEvidenceEnvelope({ ...input, payload: { mode: 'attention' } });
    expect(first.fingerprint).toBe(second.fingerprint);
  });

  test('rejects unsupported targets and authoritative output', () => {
    expect(() =>
      buildHolographicEvidenceEnvelope({ ...input, target: 'unknown-display' }),
    ).toThrow();
    expect(() => buildHolographicEvidenceEnvelope({ ...input, advisoryOnly: false })).toThrow();
  });
});
