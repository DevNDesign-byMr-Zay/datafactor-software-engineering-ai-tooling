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

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

/**
 * Turn an AI/operator intent into a deterministic, renderer-neutral scene plan.
 * This is a planning boundary only: it cannot authorize physical actuation.
 */
export function planHolographicScene({
  snapshotId,
  provenanceRef,
  intent,
  target = 'web-dashboard',
  objects = [],
  alerts = [],
  depthScale = 1,
} = {}) {
  const cleanSnapshotId = text(snapshotId, 'snapshotId');
  const cleanProvenanceRef = text(provenanceRef, 'provenanceRef');
  const cleanIntent = text(intent, 'intent');
  const cleanTarget = text(target, 'target');
  if (!TARGETS.has(cleanTarget)) throw new TypeError(`unsupported holographic target: ${cleanTarget}`);
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

  const scene = deepFreeze({
    sceneVersion: 1,
    sceneId,
    intent: cleanIntent,
    target: cleanTarget,
    nodes,
    alerts: alerts.map((alert, index) => text(alert, `alerts[${index}]`)),
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
