export function calculateSustainabilityEfficiency(
  { durationMs, estimatedEnergyWh, renewableRatio = 0 } = {},
) {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new TypeError('durationMs must be a non-negative finite number');
  }
  if (!Number.isFinite(estimatedEnergyWh) || estimatedEnergyWh < 0) {
    throw new TypeError('estimatedEnergyWh must be a non-negative finite number');
  }
  if (
    !Number.isFinite(renewableRatio) ||
    renewableRatio < 0 ||
    renewableRatio > 1
  ) {
    throw new TypeError('renewableRatio must be between 0 and 1');
  }

  const energyPerSecond =
    durationMs === 0 ? 0 : estimatedEnergyWh / (durationMs / 1000);
  const renewableAdjustedEnergyWh = estimatedEnergyWh * (1 - renewableRatio);

  return Object.freeze({
    energyPerSecondWh: energyPerSecond,
    renewableAdjustedEnergyWh,
  });
}
