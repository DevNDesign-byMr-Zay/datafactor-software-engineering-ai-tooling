import { buildHolographicEvidenceEnvelope } from './evidence-envelope.js';

const TARGETS = new Set(['holo-mat', 'projector', 'volumetric-3d', 'ar-vr', 'web-dashboard']);

function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function text(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function finite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
}

function snapshotPlanningEvidence(value, path = 'planningEvidence', seen = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return finite(value, path);
  if (!value || typeof value !== 'object') {
    throw new TypeError(`${path} must contain JSON-compatible evidence`);
  }
  if (seen.has(value)) throw new TypeError(`${path} must not contain circular references`);
  seen.add(value);

  let copy;
  if (Array.isArray(value)) {
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new TypeError(`${path} must not contain symbol properties`);
    }
    const allowed = new Set(['length']);
    copy = [];
    for (let index = 0; index < value.length; index += 1) {
      const key = String(index);
      allowed.add(key);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor) throw new TypeError(`${path} must not contain sparse arrays`);
      if (!descriptor.enumerable || 'get' in descriptor || 'set' in descriptor) {
        throw new TypeError(`${path}[${index}] must be enumerable data`);
      }
      copy.push(snapshotPlanningEvidence(descriptor.value, `${path}[${index}]`, seen));
    }
    if (Reflect.ownKeys(value).some((key) => typeof key !== 'string' || !allowed.has(key))) {
      throw new TypeError(`${path} arrays must not contain extra properties`);
    }
  } else {
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      throw new TypeError(`${path} must use plain objects`);
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new TypeError(`${path} must not contain symbol properties`);
    }
    copy = {};
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (!descriptor.enumerable || 'get' in descriptor || 'set' in descriptor) {
        throw new TypeError(`${path}.${key} must be enumerable data`);
      }
      copy[key] = snapshotPlanningEvidence(descriptor.value, `${path}.${key}`, seen);
    }
  }

  seen.delete(value);
  return copy;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object') return value;
  for (const child of Object.values(value)) deepFreeze(child);
  if (!Object.isFrozen(value)) Object.freeze(value);
  return value;
}

/**
 * Turn an AI/operator intent into a deterministic, renderer-neutral scene plan.
 * This is a planning boundary only: it cannot authorize physical actuation.
 *
 * @param {{
 *   snapshotId?: string,
 *   provenanceRef?: string,
 *   intent?: string,
 *   target?: string,
 *   objects?: Array<Record<string, unknown>>,
 *   alerts?: unknown[],
 *   depthScale?: number,
 *   constraints?: unknown,
 *   animation?: unknown
 * }} [options]
 */
export function planHolographicScene({
  snapshotId,
  provenanceRef,
  intent,
  target = 'web-dashboard',
  objects = [],
  alerts = [],
  depthScale = 1,
  constraints,
  animation,
} = {}) {
  const cleanSnapshotId = text(snapshotId, 'snapshotId');
  const cleanProvenanceRef = text(provenanceRef, 'provenanceRef');
  const cleanIntent = text(intent, 'intent');
  const cleanTarget = text(target, 'target');
  if (!TARGETS.has(cleanTarget))
    throw new TypeError(`unsupported holographic target: ${cleanTarget}`);
  if (!Array.isArray(objects)) throw new TypeError('objects must be an array');
  if (!Array.isArray(alerts)) throw new TypeError('alerts must be an array');
  finite(depthScale, 'depthScale');
  if (depthScale <= 0) throw new TypeError('depthScale must be greater than zero');

  const sceneId = `scene-${
    cleanSnapshotId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'grid'
  }`;
  const nodes = objects.map((item, index) => {
    const value = object(item, `objects[${index}]`);
    return {
      id: text(value.id ?? `object-${index}`, `objects[${index}].id`),
      kind: text(value.kind ?? 'asset', `objects[${index}].kind`),
      position: {
        x: finite(value.x ?? 0, `objects[${index}].x`),
        y: finite(value.y ?? 0, `objects[${index}].y`),
        z: finite(value.z ?? index, `objects[${index}].z`) * depthScale,
      },
      emphasis: value.emphasis === true,
    };
  });

  const capturedConstraints =
    constraints === undefined ? undefined : snapshotPlanningEvidence(constraints, 'constraints');
  const capturedAnimation =
    animation === undefined ? undefined : snapshotPlanningEvidence(animation, 'animation');

  const scene = deepFreeze({
    sceneVersion: 1,
    sceneId,
    snapshotId: cleanSnapshotId,
    intent: cleanIntent,
    target: cleanTarget,
    nodes,
    alerts: alerts.map((alert, index) => text(alert, `alerts[${index}]`)),
    ...(capturedConstraints === undefined ? {} : { constraints: capturedConstraints }),
    ...(capturedAnimation === undefined ? {} : { animation: capturedAnimation }),
    safety: {
      advisoryOnly: true,
      authoritative: false,
      physicalActuation: false,
    },
  });

  return Object.freeze({
    scene,
    evidence: buildHolographicEvidenceEnvelope({
      snapshotId: cleanSnapshotId,
      sceneId,
      provenanceRef: cleanProvenanceRef,
      target: cleanTarget,
      payload: scene,
      advisoryOnly: true,
    }),
  });
}

export { TARGETS };
