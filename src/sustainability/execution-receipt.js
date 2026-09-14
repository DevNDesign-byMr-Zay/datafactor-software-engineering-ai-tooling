export function createSustainabilityReceipt({
  workload,
  durationMs,
  estimatedEnergyWh,
  renewableRatio = 0,
}) {
  if (estimatedEnergyWh < 0) {
    throw new Error("estimatedEnergyWh must be non-negative");
  }

  if (renewableRatio < 0 || renewableRatio > 1) {
    throw new Error("renewableRatio must be between 0 and 1");
  }

  return Object.freeze({
    version: 1,
    workload,
    durationMs,
    estimatedEnergyWh,
    renewableRatio,
  });
}
