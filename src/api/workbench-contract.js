/**
 * Canonical maintained workflow contract for both local ÆtherForge adapters.
 * Do not add HTTP, network or persistence side effects here; server-specific
 * host, origin, asset and execution policies remain in their respective adapters.
 */

import {
  buildCloudRunDeployArgs,
  clampBrushSize,
  clampFeather,
  normalizeBrushShape,
  computeStrokeSteps,
  planHolographicScene,
  calculateSustainabilityEfficiency,
  consumeRuntimeAcceptanceEvidence,
} from '../index.js';

export const WORKBENCH_MODULES = Object.freeze([
  {
    id: 'auth',
    name: 'Authentication & CORS',
    category: 'Security',
    path: './auth',
    description: 'Authentication policy and validated origin handling',
    action: null,
  },
  {
    id: 'api',
    name: 'API route validation',
    category: 'Security',
    path: './index',
    description: 'Bounded request validation and structured failures',
    action: null,
  },
  {
    id: 'deploy',
    name: 'Cloud Run preflight',
    category: 'Deployment',
    path: './cloud-run',
    description: 'Credential-free deployment argument planning',
    action: 'cloud',
  },
  {
    id: 'runtime',
    name: 'Runtime Acceptance',
    category: 'Evidence',
    path: './runtime-acceptance-consumer',
    description: 'Verify durable receipts and fingerprints',
    action: 'receipt',
  },
  {
    id: 'holographic',
    name: 'Holographic Scene Planning',
    category: 'Spatial',
    path: './holographic-scene-planner',
    description: 'Advisory-only spatial scene plans with evidence',
    action: 'holo',
  },
  {
    id: 'sustainability',
    name: 'Sustainability Efficiency',
    category: 'Sustainability',
    path: './index',
    description: 'Evidence-aware energy and workload calculations',
    action: 'energy',
  },
  {
    id: 'frontend',
    name: 'Erase & Mask Geometry',
    category: 'Frontend',
    path: './erase-mask',
    description: 'Normalize brush size, shape, feather and stroke spacing',
    action: 'brush',
  },
  {
    id: 'bootstrap',
    name: 'Application Bootstrap',
    category: 'Runtime',
    path: './application-bootstrap',
    description: 'Package and readiness contract utilities',
    action: null,
  },
  {
    id: 'storage',
    name: 'Cloud File Workflow',
    category: 'Storage',
    path: './index',
    description: 'Validated cloud upload, signed URL and chat boundaries',
    action: null,
  },
  {
    id: 'observability',
    name: 'Observability',
    category: 'Reliability',
    path: './json-logger',
    description: 'Structured logging and bounded error reporting',
    action: null,
  },
]);

/**
 * Execute a validated workflow request without changing the existing response.
 * The callers must parse request bodies through workflowRequestSchema first.
 *
 * @param {{ action: string, inputs: Record<string, any> }} body
 */
export function runWorkbenchAction(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new TypeError('Invalid workflow body');
  }
  const v = body.inputs;
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    throw new TypeError('Invalid inputs');
  }

  switch (body.action) {
    case 'cloud':
      return {
        status: 'planned',
        advisoryOnly: true,
        executed: false,
        result: buildCloudRunDeployArgs({
          serviceName: v.serviceName,
          region: v.region || 'us-central1',
          source: '.',
          envVarsFile: 'run-env.yaml',
          allowUnauthenticated: false,
        }),
      };
    case 'brush':
      return {
        status: 'computed',
        result: {
          brushSize: clampBrushSize(Number(v.brushSize)),
          shape: normalizeBrushShape(v.shape),
          feather: clampFeather(Number(v.feather)),
          strokeSteps: computeStrokeSteps({
            distance: Number(v.distance),
            brushSize: Number(v.brushSize),
          }),
        },
      };
    case 'holo':
      return {
        status: 'planned',
        advisoryOnly: true,
        executed: false,
        result: planHolographicScene({
          snapshotId: v.snapshotId,
          provenanceRef: v.provenanceRef,
          intent: v.intent,
          target: 'web-dashboard',
          objects: [{ id: 'reference-object', kind: 'asset', x: 0, y: 0, z: 0 }],
        }),
      };
    case 'energy':
      return {
        status: 'computed',
        derivedFrom: 'user-supplied estimates',
        result: calculateSustainabilityEfficiency({
          durationMs: Number(v.durationMs),
          estimatedEnergyWh: Number(v.estimatedEnergyWh),
          renewableRatio: Number(v.renewableRatio),
        }),
      };
    case 'receipt':
      return {
        status: 'checked',
        authority: 'none',
        result: consumeRuntimeAcceptanceEvidence({
          receipt: v.receipt,
          receiptFingerprint: v.receiptFingerprint,
          previousFingerprint: v.previousFingerprint || undefined,
        }),
      };
    default:
      throw new TypeError('Unsupported workflow');
  }
}

export function summarizeWorkbench() {
  const categories = [...new Set(WORKBENCH_MODULES.map((module) => module.category))].map(
    (category) => ({
      category,
      count: WORKBENCH_MODULES.filter((module) => module.category === category).length,
    }),
  );
  return {
    source: 'maintained-library',
    moduleCount: WORKBENCH_MODULES.length,
    categories,
    quickActions: [
      { id: 'studio', label: 'Open Workflow Studio', description: 'Run bounded library calculations', page: 'studio' },
      { id: 'modules', label: 'Browse Module Library', description: 'Inspect maintained capabilities', page: 'modules' },
      { id: 'evidence', label: 'Verify Evidence', description: 'Fail-closed receipt inspection', page: 'evidence' },
      { id: 'assets', label: 'Open Asset Studio', description: 'Review shipped ÆtherForge assets', page: 'assets' },
    ],
    boundary: {
      cloudMutations: false,
      aiProvider: false,
      localAdapterOnly: true,
      externalNetworkCalls: false,
    },
  };
}
