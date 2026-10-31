/**
 * Declarative, dependency-free schemas for the *actual* ÆtherForge /api/run
 * handlers. The workbench sends numeric form fields as strings, so compatible
 * numeric strings are accepted without coercing the workflow's original input.
 * Unknown fields are rejected before any workflow implementation runs.
 */
export const WORKFLOW_INPUT_SCHEMAS = Object.freeze({
  cloud: Object.freeze({
    serviceName: { kind: 'string', max: 120 },
    region: { kind: 'string', max: 80, optional: true },
  }),
  brush: Object.freeze({
    brushSize: { kind: 'finite-number' },
    distance: { kind: 'finite-number' },
    feather: { kind: 'finite-number' },
    shape: { kind: 'string', max: 32 },
  }),
  holo: Object.freeze({
    snapshotId: { kind: 'string', max: 160 },
    provenanceRef: { kind: 'string', max: 256 },
    intent: { kind: 'string', max: 500 },
  }),
  energy: Object.freeze({
    durationMs: { kind: 'finite-number' },
    estimatedEnergyWh: { kind: 'finite-number' },
    renewableRatio: { kind: 'finite-number' },
  }),
  receipt: Object.freeze({
    receipt: { kind: 'object' },
    receiptFingerprint: { kind: 'string', max: 128 },
    previousFingerprint: { kind: 'string', max: 128, optional: true },
  }),
});

export class WorkflowValidationError extends TypeError {
  constructor() {
    super('Invalid workflow input. Review the required fields.');
    this.name = 'WorkflowValidationError';
    this.code = 'WORKFLOW_SCHEMA_INVALID';
    this.statusCode = 422;
  }
}

function plainRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validValue(value, spec) {
  if (spec.kind === 'string') {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= spec.max;
  }
  if (spec.kind === 'object') return plainRecord(value);
  if (spec.kind === 'finite-number') {
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value !== 'string' || !value.trim()) return false;
    return Number.isFinite(Number(value));
  }
  return false;
}

export const workflowRequestSchema = Object.freeze({
  parse(body) {
    if (
      !plainRecord(body) ||
      Reflect.ownKeys(body).some((key) => !['action', 'inputs'].includes(key))
    ) {
      throw new WorkflowValidationError();
    }
    const action = Object.getOwnPropertyDescriptor(body, 'action');
    const inputs = Object.getOwnPropertyDescriptor(body, 'inputs');
    if (
      !action ||
      !('value' in action) ||
      typeof action.value !== 'string' ||
      !Object.hasOwn(WORKFLOW_INPUT_SCHEMAS, action.value) ||
      !inputs ||
      !('value' in inputs) ||
      !plainRecord(inputs.value)
    ) {
      throw new WorkflowValidationError();
    }
    const fields = WORKFLOW_INPUT_SCHEMAS[action.value];
    const descriptors = Object.getOwnPropertyDescriptors(inputs.value);
    const allowed = Object.keys(fields);
    if (Reflect.ownKeys(inputs.value).some((key) => !allowed.includes(key))) {
      throw new WorkflowValidationError();
    }
    const checked = {};
    for (const [field, spec] of Object.entries(fields)) {
      const descriptor = descriptors[field];
      if (!descriptor && spec.optional) continue;
      if (!descriptor || !('value' in descriptor) || !validValue(descriptor.value, spec)) {
        throw new WorkflowValidationError();
      }
      checked[field] = descriptor.value;
    }
    return Object.freeze({ action: action.value, inputs: Object.freeze(checked) });
  },
  safeParse(body) {
    try {
      return { success: true, data: this.parse(body) };
    } catch (error) {
      if (!(error instanceof WorkflowValidationError)) throw error;
      return { success: false, error };
    }
  },
});
