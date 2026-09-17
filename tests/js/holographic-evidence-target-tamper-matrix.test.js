import {
  buildHolographicEvidenceEnvelope,
  TARGETS,
  validateHolographicEvidenceEnvelope,
} from '../../src/holographic/evidence-envelope.js';

describe('holographic evidence target and tamper matrix', () => {
  test.each(TARGETS)('validates advisory evidence for %s', (target) => {
    const envelope = buildHolographicEvidenceEnvelope({
      snapshotId: `snapshot-${target}`,
      sceneId: `scene-${target}`,
      provenanceRef: `receipt-${target}`,
      target,
      renderer: 'renderer-neutral',
      payload: { target, mode: 'preview' },
    });

    expect(validateHolographicEvidenceEnvelope(envelope)).toBe(true);
    expect(envelope.target).toBe(target);
    expect(envelope.safety.authoritative).toBe(false);
    expect(envelope.safety.physicalActuation).toBe(false);
  });

  test.each([
    ['sceneId', 'scene-tampered'],
    ['provenanceRef', 'receipt-tampered'],
    ['target', 'projector'],
    ['renderer', 'renderer-tampered'],
    ['payload', { mode: 'tampered' }],
  ])('rejects %s tampering with the original fingerprint', (field, value) => {
    const envelope = buildHolographicEvidenceEnvelope({
      snapshotId: 'snapshot-original',
      sceneId: 'scene-original',
      provenanceRef: 'receipt-original',
      target: 'holo-mat',
      renderer: 'renderer-neutral',
      payload: { mode: 'preview' },
    });

    expect(
      validateHolographicEvidenceEnvelope({
        ...envelope,
        [field]: value,
      }),
    ).toBe(false);
  });
});
