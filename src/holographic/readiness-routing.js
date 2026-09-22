import { createHash } from 'node:crypto';

import { negotiateHolographicCapabilities } from './capability-negotiation.js';
import { verifyValidatedHolographicSceneHandoff } from './validated-scene-handoff.js';

const DEVICE_KEYS = Object.freeze(['id', 'target', 'capabilities']);
const SAFETY = Object.freeze({
  advisoryOnly: true,
  authoritative: false,
  physicalActuation: false,
  automaticSelection: false,
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

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function freezeRoute(route) {
  Object.freeze(route.missingCapabilities);
  return Object.freeze(route);
}

export function evaluateHolographicReadiness({ handoff, devices, requiredCapabilities = [] } = {}) {
  if (!verifyValidatedHolographicSceneHandoff(handoff)) {
    throw new TypeError('handoff must be a valid accepted holographic scene handoff');
  }
  if (!Array.isArray(devices) || devices.length === 0) {
    throw new TypeError('at least one device descriptor is required');
  }

  const seenIds = new Set();
  const routes = devices.map((input, index) => {
    const device = dataObject(input, DEVICE_KEYS, `devices[${index}]`);
    const deviceId = text(device.id, `devices[${index}].id`);
    if (seenIds.has(deviceId)) throw new TypeError(`duplicate device id: ${deviceId}`);
    seenIds.add(deviceId);

    const target = text(device.target, `devices[${index}].target`);
    if (target !== handoff.scene.target) {
      return freezeRoute({
        deviceId,
        target,
        status: 'blocked',
        compatible: false,
        reason: 'TARGET_MISMATCH',
        missingCapabilities: Object.freeze([]),
        capabilityFingerprint: null,
      });
    }

    const compatibility = negotiateHolographicCapabilities({
      handoff,
      capabilityDescriptor: {
        target,
        capabilities: device.capabilities,
      },
      requiredCapabilities,
    });
    return freezeRoute({
      deviceId,
      target,
      status: compatibility.compatible ? 'ready' : 'blocked',
      compatible: compatibility.compatible,
      reason: compatibility.compatible ? null : 'CAPABILITY_GAP',
      missingCapabilities: Object.freeze([...compatibility.missingCapabilities]),
      capabilityFingerprint: compatibility.capabilityFingerprint,
    });
  });

  routes.sort((left, right) => left.deviceId.localeCompare(right.deviceId));
  const frozenRoutes = Object.freeze(routes);
  const body = {
    version: 1,
    sceneId: handoff.scene.sceneId,
    sceneFingerprint: handoff.sceneFingerprint,
    handoffFingerprint: handoff.handoffFingerprint,
    ready: frozenRoutes.some((route) => route.compatible),
    routes: frozenRoutes,
    safety: { ...SAFETY },
  };
  Object.freeze(body.safety);
  return Object.freeze({
    ...body,
    readinessFingerprint: fingerprint(body),
  });
}
