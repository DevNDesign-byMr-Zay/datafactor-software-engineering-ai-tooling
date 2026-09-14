export function createSustainabilityEvidenceBundle({ receipt, metadata, efficiency }) {
  if (!receipt || !metadata || !efficiency) {
    throw new Error('Sustainability evidence bundle requires complete inputs');
  }

  return Object.freeze({
    receipt,
    metadata,
    efficiency,
    version: 1,
  });
}
