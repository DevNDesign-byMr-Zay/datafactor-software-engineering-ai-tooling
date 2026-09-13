const INTERACTION_TYPES = Object.freeze([
  'orbit',
  'pan',
  'zoom',
  'select',
  'focus',
  'clear-selection',
]);

function finite(value, name, fallback = 0) {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value))
    throw new TypeError(`${name} must be a finite number.`);
  return value;
}

function nodeId(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError('nodeId must be a non-empty string.');
  }
  return value.trim();
}

export function normalizeSpatialInteractionIntent(intent = {}) {
  if (!intent || typeof intent !== 'object' || Array.isArray(intent)) {
    throw new TypeError('interaction intent must be an object.');
  }

  const type = intent.type;
  if (!INTERACTION_TYPES.includes(type)) {
    throw new TypeError(`Unsupported spatial interaction type: ${type}`);
  }

  switch (type) {
    case 'orbit':
      return Object.freeze({
        type,
        deltaYaw: finite(intent.deltaYaw, 'deltaYaw'),
        deltaPitch: finite(intent.deltaPitch, 'deltaPitch'),
      });
    case 'pan':
      return Object.freeze({
        type,
        x: finite(intent.x, 'x'),
        y: finite(intent.y, 'y'),
        z: finite(intent.z, 'z'),
      });
    case 'zoom':
      return Object.freeze({ type, delta: finite(intent.delta, 'delta') });
    case 'select':
    case 'focus':
      return Object.freeze({ type, nodeId: nodeId(intent.nodeId) });
    case 'clear-selection':
      return Object.freeze({ type });
    default:
      throw new TypeError(`Unsupported spatial interaction type: ${type}`);
  }
}

export { INTERACTION_TYPES };
