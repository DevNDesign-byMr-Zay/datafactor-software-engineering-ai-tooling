import {
  createSustainabilityReceipt,
  validateSustainabilityReceipt,
} from '../src/sustainability/execution-receipt.js';
import {
  createSustainabilityEfficiencyObservation,
  validateSustainabilityEfficiencyObservation,
} from '../src/sustainability/efficiency-observation.js';

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

const summary = {
  receiptVersion: receipt.version,
  receiptFingerprint: receipt.receiptFingerprint,
  workload: receipt.workload,
  durationMs: receipt.durationMs,
  estimatedEnergyWh: receipt.estimatedEnergyWh,
  reportedRenewableRatio: receipt.renewableRatio,
  observationVersion: observation.version,
  observationFingerprint: observation.observationFingerprint,
  sourceReceiptFingerprint: observation.sourceReceiptFingerprint,
  averagePower: observation.metrics.averagePower,
  estimatedNonRenewableShareEnergy: observation.metrics.estimatedNonRenewableShareEnergy,
  interpretation: observation.interpretation,
  advisoryOnly: observation.safety.advisoryOnly,
  authoritative: observation.safety.authoritative,
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
