const DISPLAY_TYPES = Object.freeze(['projector', 'holomat', 'three-d-platform']);
const SCENE_TYPES = Object.freeze(['presentation', 'product', 'diagram', 'environment']);
const INTERACTION_TYPES = Object.freeze(['orbit', 'pan', 'zoom', 'select', 'focus']);

function text(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} must be a non-empty string.`);
  }
  return value.trim();
}

function list(value, name) {
  if (value === undefined) return Object.freeze([]);
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== 'string' || item.trim() === '')
  ) {
    throw new TypeError(`${name} must be an array of non-empty strings.`);
  }
  return Object.freeze(value.map((item) => item.trim()));
}

function finite(value, name, fallback) {
  if (value === undefined && fallback !== undefined) return fallback;
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number.`);
  }
  return value;
}

function interaction(value) {
  if (value === undefined || value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('interaction must be an object.');
  }

  const type = text(value.type, 'interaction.type');
  if (!INTERACTION_TYPES.includes(type)) {
    throw new TypeError(`Unsupported interaction type: ${type}`);
  }

  switch (type) {
    case 'orbit': {
      if (value.deltaYaw === undefined && value.deltaPitch === undefined) {
        throw new TypeError('orbit interaction requires deltaYaw or deltaPitch.');
      }
      return Object.freeze({
        type,
        deltaYaw: finite(value.deltaYaw, 'interaction.deltaYaw', 0),
        deltaPitch: finite(value.deltaPitch, 'interaction.deltaPitch', 0),
      });
    }
    case 'pan': {
      if (value.x === undefined && value.y === undefined && value.z === undefined) {
        throw new TypeError('pan interaction requires x, y, or z.');
      }
      return Object.freeze({
        type,
        x: finite(value.x, 'interaction.x', 0),
        y: finite(value.y, 'interaction.y', 0),
        z: finite(value.z, 'interaction.z', 0),
      });
    }
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
    default:
      throw new TypeError(`Unsupported interaction type: ${type}`);
  }
}

export function interpretHolographicIntent({
  prompt,
  sceneType = 'presentation',
  displayType = 'projector',
  assetIds = [],
  constraints = {},
  animation = {},
  interaction: interactionIntent,
} = {}) {
  const normalizedPrompt = text(prompt, 'prompt');
  if (!SCENE_TYPES.includes(sceneType)) {
    throw new TypeError(`Unsupported scene type: ${sceneType}`);
  }
  if (!DISPLAY_TYPES.includes(displayType)) {
    throw new TypeError(`Unsupported display type: ${displayType}`);
  }
  if (!constraints || typeof constraints !== 'object' || Array.isArray(constraints)) {
    throw new TypeError('constraints must be an object.');
  }
  if (!animation || typeof animation !== 'object' || Array.isArray(animation)) {
    throw new TypeError('animation must be an object.');
  }

  return Object.freeze({
    prompt: normalizedPrompt,
    sceneType,
    displayType,
    assetIds: list(assetIds, 'assetIds'),
    constraints: Object.freeze({ ...constraints }),
    animation: Object.freeze({ ...animation }),
    interaction: interaction(interactionIntent),
  });
}
