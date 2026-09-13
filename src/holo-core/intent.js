import { TARGETS } from '../holographic/evidence-envelope.js';
import { normalizeSpatialInteractionIntent } from './interaction.js';

const SCENE_TYPES = Object.freeze(['presentation', 'product', 'diagram', 'environment']);

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

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function immutableCopy(value) {
  return deepFreeze(structuredClone(value));
}

export function interpretHolographicIntent({
  prompt,
  sceneType = 'presentation',
  target = 'web-dashboard',
  assetIds = [],
  constraints = {},
  animation = {},
  interaction = null,
} = {}) {
  const normalizedPrompt = text(prompt, 'prompt');
  if (!SCENE_TYPES.includes(sceneType)) throw new TypeError(`Unsupported scene type: ${sceneType}`);
  if (!TARGETS.includes(target)) throw new TypeError(`Unsupported holographic target: ${target}`);
  if (!constraints || typeof constraints !== 'object' || Array.isArray(constraints)) {
    throw new TypeError('constraints must be an object.');
  }
  if (!animation || typeof animation !== 'object' || Array.isArray(animation)) {
    throw new TypeError('animation must be an object.');
  }

  return Object.freeze({
    prompt: normalizedPrompt,
    sceneType,
    target,
    assetIds: list(assetIds, 'assetIds'),
    constraints: immutableCopy(constraints),
    animation: immutableCopy(animation),
    interaction: interaction === null ? null : normalizeSpatialInteractionIntent(interaction),
  });
}

export { SCENE_TYPES };
