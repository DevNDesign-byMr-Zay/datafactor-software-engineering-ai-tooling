export function createEvidenceSummary({ status, efficiency, renewableRatio = 0 } = {}) {
  if (typeof status !== 'string' || status.length === 0) {
    throw new Error('status is required');
  }
  if (!Number.isFinite(efficiency) || efficiency < 0) {
    throw new Error('efficiency must be non-negative');
  }

  return Object.freeze({
    status,
    efficiency,
    renewableRatio,
  });
}
