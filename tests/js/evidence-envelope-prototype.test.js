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
});
