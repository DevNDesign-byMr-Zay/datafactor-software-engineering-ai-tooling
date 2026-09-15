import {
  createSustainabilityEvidencePackageFromExecution,
  validateSustainabilityEvidencePackage,
} from '../src/index.js';

const evidencePackage = createSustainabilityEvidencePackageFromExecution({
  workload: {
    name: 'demo-scene-analysis',
    model: 'SOLVÆR',
    runType: 'reproducible-demo',
  },
  durationMs: 3_600_000,
  estimatedEnergyWh: 20,
  renewableRatio: 0.25,
  source: 'reproducible-demo',
});

if (!validateSustainabilityEvidencePackage(evidencePackage)) {
  throw new Error('sustainability evidence package failed validation');
}
if (
  evidencePackage.safety.advisoryOnly !== true ||
  evidencePackage.safety.authoritative !== false ||
  evidencePackage.safety.recommendsAction !== false ||
  evidencePackage.safety.schedulesWorkloads !== false ||
  evidencePackage.safety.deploysWorkloads !== false ||
  evidencePackage.safety.physicalActuation !== false
) {
  throw new Error('sustainability package crossed its evidence-only safety boundary');
}

process.stdout.write(`${JSON.stringify(evidencePackage, null, 2)}\n`);
