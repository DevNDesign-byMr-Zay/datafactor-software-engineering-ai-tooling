import { calculateSustainabilityEfficiency } from './efficiency-score.js';
import { createSustainabilityEfficiencyObservation } from './efficiency-observation.js';
import { createSustainabilityEvidenceBundle } from './evidence-bundle.js';
import { createSustainabilityEvidenceChain } from './evidence-chain.js';
import { createSustainabilityEvidenceExport } from './evidence-export.js';
import { createSustainabilityEvidencePackage } from './evidence-package.js';
import { createSustainabilityReceipt } from './execution-receipt.js';
import { createSustainabilityMetadata } from './sustainability-metadata.js';

export function createSustainabilityEvidencePackageFromExecution({
  workload,
  durationMs,
  estimatedEnergyWh,
  renewableRatio = 0,
  source = 'runtime',
} = {}) {
  const receipt = createSustainabilityReceipt({
    workload,
    durationMs,
    estimatedEnergyWh,
    renewableRatio,
  });
  const observation = createSustainabilityEfficiencyObservation(receipt);
  const metadata = createSustainabilityMetadata({
    energyWh: receipt.estimatedEnergyWh,
    renewableRatio: receipt.renewableRatio,
    source,
  });
  const efficiency = calculateSustainabilityEfficiency({
    durationMs: receipt.durationMs,
    estimatedEnergyWh: receipt.estimatedEnergyWh,
    renewableRatio: receipt.renewableRatio,
  });
  const bundle = createSustainabilityEvidenceBundle({ receipt, metadata, efficiency });
  const chain = createSustainabilityEvidenceChain({ receipt, observation, bundle });
  const evidenceExport = createSustainabilityEvidenceExport({
    receipt,
    observation,
    bundle,
    chain,
  });

  return createSustainabilityEvidencePackage({
    receipt,
    observation,
    bundle,
    chain,
    evidenceExport,
  });
}
