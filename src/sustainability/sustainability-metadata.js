export function createSustainabilityMetadata({
  energyWh,
  renewableRatio = 0,
  source = 'runtime',
} = {}) {
  if (!Number.isFinite(energyWh) || energyWh < 0) {
    throw new TypeError('energyWh must be a non-negative finite number');
  }
  if (!Number.isFinite(renewableRatio) || renewableRatio < 0 || renewableRatio > 1) {
    throw new TypeError('renewableRatio must be between 0 and 1');
  }

  return Object.freeze({
    energyWh,
    renewableRatio,
    source,
  });
}
