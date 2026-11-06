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

const DECIMAL_NUMBER_STRING_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/iu;
const MAX_DECIMAL_NUMBER_LENGTH = 64;

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
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    // Untrusted Proxy traps must become a validation failure, never a 500.
    return false;
  }
}

/**
 * Take one safe snapshot of a JSON-shaped record. In particular, do not
 * re-read user-supplied properties after validating their descriptors.
 */
function ownDataDescriptors(value) {
  if (!plainRecord(value)) return null;
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (
      Reflect.ownKeys(descriptors).some(
        (key) =>
          typeof key !== 'string' ||
          !descriptors[key].enumerable ||
          !Object.hasOwn(descriptors[key], 'value'),
      )
    ) {
      return null;
    }
    return descriptors;
  } catch {
    return null;
  }
}

function validValue(value, spec) {
  if (spec.kind === 'string') {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= spec.max;
  }
  if (spec.kind === 'object') return plainRecord(value);
  if (spec.kind === 'finite-number') {
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    return (
      trimmed.length > 0 &&
      trimmed.length <= MAX_DECIMAL_NUMBER_LENGTH &&
      DECIMAL_NUMBER_STRING_PATTERN.test(trimmed) &&
      Number.isFinite(Number(trimmed))
    );
  }
  return false;
}

export const workflowRequestSchema = Object.freeze({
  parse(body) {
    const bodyFields = ownDataDescriptors(body);
    if (
      !bodyFields ||
      Object.keys(bodyFields).some((key) => key !== 'action' && key !== 'inputs')
    ) {
      throw new WorkflowValidationError();
    }
    const action = bodyFields.action;
    const inputs = bodyFields.inputs;
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
    const descriptors = ownDataDescriptors(inputs.value);
    if (!descriptors || Object.keys(descriptors).some((key) => !Object.hasOwn(fields, key))) {
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
