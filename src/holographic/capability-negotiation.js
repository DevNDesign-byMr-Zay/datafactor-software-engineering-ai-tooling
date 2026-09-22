import { createHash } from 'node:crypto';

import { verifyValidatedHolographicSceneHandoff } from './validated-scene-handoff.js';

const RESULT_KEYS = Object.freeze([
  'version',
  'compatible',
  'target',
  'sceneId',
  'sceneFingerprint',
  'handoffFingerprint',
  'requiredCapabilities',
  'availableCapabilities',
  'missingCapabilities',
  'safety',
  'capabilityFingerprint',
]);
const DESCRIPTOR_KEYS = Object.freeze(['target', 'capabilities']);
const SAFETY = Object.freeze({
  advisoryOnly: true,
  authoritative: false,
  physicalActuation: false,
});

function dataObject(value, expectedKeys, path) {
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
  const unexpected = Object.keys(descriptors).find((key) => !expectedKeys.includes(key));
  if (unexpected) throw new TypeError(`${path} contains unsupported field: ${unexpected}`);

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

function stringList(value, path) {
  if (!Array.isArray(value)) throw new TypeError(`${path} must be an array`);
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${path} must not contain symbol properties`);
  }

  const allowed = new Set(['length']);
  const normalized = [];
  for (let index = 0; index < value.length; index += 1) {
    const key = String(index);
    allowed.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) throw new TypeError(`${path} must not contain sparse entries`);
    if (!descriptor.enumerable || 'get' in descriptor || 'set' in descriptor) {
      throw new TypeError(`${path}[${index}] must be enumerable data`);
    }
    normalized.push(text(descriptor.value, `${path}[${index}]`));
  }
  if (Reflect.ownKeys(value).some((key) => typeof key !== 'string' || !allowed.has(key))) {
    throw new TypeError(`${path} must not contain extra properties`);
  }
  return Object.freeze([...new Set(normalized)].sort());
}

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function freezeResult(value) {
  Object.freeze(value.requiredCapabilities);
  Object.freeze(value.availableCapabilities);
  Object.freeze(value.missingCapabilities);
  Object.freeze(value.safety);
  return Object.freeze(value);
}

function buildCore({ handoff, capabilityDescriptor, requiredCapabilities }) {
  if (!verifyValidatedHolographicSceneHandoff(handoff)) {
    throw new TypeError('handoff must be a valid accepted holographic scene handoff');
  }

  const descriptor = dataObject(capabilityDescriptor, DESCRIPTOR_KEYS, 'capabilityDescriptor');
  const target = text(descriptor.target, 'capabilityDescriptor.target');
  if (target !== handoff.scene.target) {
    throw new TypeError('capability target must match the accepted handoff target');
  }

  const required = stringList(requiredCapabilities, 'requiredCapabilities');
  const available = stringList(descriptor.capabilities, 'capabilityDescriptor.capabilities');
  const availableSet = new Set(available);
  const missing = Object.freeze(required.filter((name) => !availableSet.has(name)));

  return {
    version: 1,
    compatible: missing.length === 0,
    target,
    sceneId: handoff.scene.sceneId,
    sceneFingerprint: handoff.sceneFingerprint,
    handoffFingerprint: handoff.handoffFingerprint,
    requiredCapabilities: required,
    availableCapabilities: available,
    missingCapabilities: missing,
    safety: { ...SAFETY },
  };
}

export function negotiateHolographicCapabilities({
  handoff,
  capabilityDescriptor,
  requiredCapabilities = [],
} = {}) {
  const core = buildCore({ handoff, capabilityDescriptor, requiredCapabilities });
  return freezeResult({
    ...core,
    capabilityFingerprint: fingerprint(core),
  });
}

export function verifyHolographicCapabilityNegotiation(
  result,
  { handoff, capabilityDescriptor, requiredCapabilities = [] } = {},
) {
  try {
    const captured = dataObject(result, RESULT_KEYS, 'capabilityResult');
    const expected = negotiateHolographicCapabilities({
      handoff,
      capabilityDescriptor,
      requiredCapabilities,
    });

    return (
      captured.version === expected.version &&
      captured.compatible === expected.compatible &&
      captured.target === expected.target &&
      captured.sceneId === expected.sceneId &&
      captured.sceneFingerprint === expected.sceneFingerprint &&
      captured.handoffFingerprint === expected.handoffFingerprint &&
      JSON.stringify(captured.requiredCapabilities) ===
        JSON.stringify(expected.requiredCapabilities) &&
      JSON.stringify(captured.availableCapabilities) ===
        JSON.stringify(expected.availableCapabilities) &&
      JSON.stringify(captured.missingCapabilities) ===
        JSON.stringify(expected.missingCapabilities) &&
      JSON.stringify(captured.safety) === JSON.stringify(expected.safety) &&
      captured.capabilityFingerprint === expected.capabilityFingerprint
    );
  } catch {
    return false;
  }
}
