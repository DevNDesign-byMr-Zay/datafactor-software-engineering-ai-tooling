import {
  createSustainabilityReceipt,
  validateSustainabilityReceipt,
} from '../src/sustainability/execution-receipt.js';
import {
  createSustainabilityEfficiencyObservation,
  validateSustainabilityEfficiencyObservation,
} from '../src/sustainability/efficiency-observation.js';
import { calculateSustainabilityEfficiency } from '../src/sustainability/efficiency-score.js';
import { createSustainabilityMetadata } from '../src/sustainability/sustainability-metadata.js';
import {
  createSustainabilityEvidenceBundle,
  validateSustainabilityEvidenceBundle,
} from '../src/sustainability/evidence-bundle.js';
import {
  createSustainabilityEvidenceChain,
  validateSustainabilityEvidenceChain,
} from '../src/sustainability/evidence-chain.js';
import {
  createSustainabilityEvidenceExport,
  validateSustainabilityEvidenceExport,
} from '../src/sustainability/evidence-export.js';

const receipt = createSustainabilityReceipt({
  workload: {
    name: 'demo-scene-analysis',
    model: 'SOLVÆR',
    runType: 'reproducible-demo',
  },
  durationMs: 3_600_000,
  estimatedEnergyWh: 20,
  renewableRatio: 0.25,
});

if (!validateSustainabilityReceipt(receipt)) {
  throw new Error('sustainability receipt failed validation');
}

const observation = createSustainabilityEfficiencyObservation(receipt);
if (!validateSustainabilityEfficiencyObservation(observation, receipt)) {
  throw new Error('sustainability efficiency observation failed validation');
}
if (
  observation.safety.advisoryOnly !== true ||
  observation.safety.authoritative !== false ||
  observation.safety.recommendsAction !== false ||
  observation.safety.schedulesWorkloads !== false ||
  observation.safety.deploysWorkloads !== false ||
  observation.safety.physicalActuation !== false
) {
  throw new Error('sustainability observation crossed its evidence-only safety boundary');
}

const metadata = createSustainabilityMetadata({
  energyWh: receipt.estimatedEnergyWh,
  renewableRatio: receipt.renewableRatio,
  source: 'reproducible-demo',
});
const efficiency = calculateSustainabilityEfficiency({
  durationMs: receipt.durationMs,
  estimatedEnergyWh: receipt.estimatedEnergyWh,
  renewableRatio: receipt.renewableRatio,
});
const bundle = createSustainabilityEvidenceBundle({ receipt, metadata, efficiency });
if (!validateSustainabilityEvidenceBundle(bundle)) {
  throw new Error('sustainability evidence bundle failed validation');
}

const artifacts = { receipt, observation, bundle };
const chain = createSustainabilityEvidenceChain(artifacts);
if (!validateSustainabilityEvidenceChain(chain, artifacts)) {
  throw new Error('sustainability evidence chain failed validation');
}

const evidenceExport = createSustainabilityEvidenceExport({ ...artifacts, chain });
if (!validateSustainabilityEvidenceExport(evidenceExport, { ...artifacts, chain })) {
  throw new Error('sustainability evidence export failed validation');
}

process.stdout.write(`${JSON.stringify(evidenceExport, null, 2)}\n`);
