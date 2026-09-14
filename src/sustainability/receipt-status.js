export function getSustainabilityReceiptStatus({ estimatedEnergyWh, renewableRatio = 0 } = {}) {
  if (!Number.isFinite(estimatedEnergyWh) || estimatedEnergyWh < 0) {
    throw new TypeError('estimatedEnergyWh must be a non-negative finite number');
  }
  if (!Number.isFinite(renewableRatio) || renewableRatio < 0 || renewableRatio > 1) {
    throw new TypeError('renewableRatio must be between 0 and 1');
  }

  if (estimatedEnergyWh === 0) return 'no-energy-estimate';
  if (renewableRatio === 1) return 'renewable';
  if (renewableRatio > 0) return 'partially-renewable';
  return 'grid-only';
}
