const INTERACTION_TYPES = Object.freeze([
  'orbit',
  'pan',
  'zoom',
  'select',
  'focus',
  'clear-selection',
]);

const KEYS_BY_TYPE = Object.freeze({
  orbit: Object.freeze(['type', 'deltaYaw', 'deltaPitch']),
  pan: Object.freeze(['type', 'x', 'y', 'z']),
  zoom: Object.freeze(['type', 'delta']),
  select: Object.freeze(['type', 'nodeId']),
  focus: Object.freeze(['type', 'nodeId']),
  'clear-selection': Object.freeze(['type']),
});

function capturePlainObject(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${path} must be a plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must be a plain object`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${path} must not contain symbol properties`);
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const copy = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable || 'get' in descriptor || 'set' in descriptor) {
      throw new TypeError(`${path}.${key} must be enumerable data`);
    }
    copy[key] = descriptor.value;
  }
  return copy;
}

function text(value, path) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${path} must be a non-empty string`);
  }
  return value.trim();
}

function finite(value, path, fallback = 0) {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value)) throw new TypeError(`${path} must be finite`);
  return value;
}

function assertAllowedKeys(value, allowed, path) {
  const unsupported = Object.keys(value).find((key) => !allowed.includes(key));
  if (unsupported) {
    throw new TypeError(`${path} contains unsupported field: ${unsupported}`);
  }
}

export function normalizeHolographicInteraction(input = {}) {
  const value = capturePlainObject(input, 'interaction');
  const type = text(value.type, 'interaction.type');
  if (!INTERACTION_TYPES.includes(type)) {
    throw new TypeError(`unsupported holographic interaction type: ${type}`);
  }

  assertAllowedKeys(value, KEYS_BY_TYPE[type], 'interaction');

  switch (type) {
    case 'orbit':
      return Object.freeze({
        type,
        deltaYaw: finite(value.deltaYaw, 'interaction.deltaYaw'),
        deltaPitch: finite(value.deltaPitch, 'interaction.deltaPitch'),
      });
    case 'pan':
      return Object.freeze({
        type,
        x: finite(value.x, 'interaction.x'),
        y: finite(value.y, 'interaction.y'),
        z: finite(value.z, 'interaction.z'),
      });
    case 'zoom':
      return Object.freeze({
        type,
        delta: finite(value.delta, 'interaction.delta'),
      });
    case 'select':
    case 'focus':
      return Object.freeze({
        type,
        nodeId: text(value.nodeId, 'interaction.nodeId'),
      });
    case 'clear-selection':
      return Object.freeze({ type });
    default:
      throw new TypeError(`unsupported holographic interaction type: ${type}`);
  }
}

export { INTERACTION_TYPES };
