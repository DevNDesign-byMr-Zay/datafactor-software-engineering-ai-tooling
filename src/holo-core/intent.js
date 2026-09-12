const DISPLAY_TYPES = Object.freeze(['projector', 'holomat', 'three-d-platform']);
const SCENE_TYPES = Object.freeze(['presentation', 'product', 'diagram', 'environment']);

function text(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} must be a non-empty string.`);
  }
  return value.trim();
}

function list(value, name) {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.trim() === '')) {
    throw new TypeError(`${name} must be an array of non-empty strings.`);
  }
  return Object.freeze(value.map((item) => item.trim()));
}

export function interpretHolographicIntent({
  prompt,
  sceneType = 'presentation',
  displayType = 'projector',
  assetIds = [],
  constraints = {},
  animation = {},
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
  });
}
