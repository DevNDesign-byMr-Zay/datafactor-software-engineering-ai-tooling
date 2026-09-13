import { normalizeSpatialInteractionIntent } from './interaction.js';
import { device as normalizeDevice, negotiate, scene } from './scene.js';

export function orchestrateSpatialScene({ sceneSpec, devices = [] } = {}) {
  if (!sceneSpec || sceneSpec.schema !== 'holo.scene.v1') {
    throw new TypeError('a HoloCore scene is required');
  }
  if (!Array.isArray(devices) || devices.length === 0) {
    throw new TypeError('at least one device is required');
  }

  const normalizedScene = scene(sceneSpec);
  const routes = devices.map((inputDevice) => {
    const target = normalizeDevice(inputDevice);
    const compatibility = negotiate(normalizedScene, target);
    return Object.freeze({
      deviceId: target.id,
      deviceType: target.type,
      compatible: compatibility.compatible,
      missing: Object.freeze([...compatibility.missing]),
      status: compatibility.compatible ? 'ready' : 'blocked',
    });
  });

  return Object.freeze({
    sceneId: normalizedScene.id,
    routes: Object.freeze(routes),
    ready: routes.some((route) => route.compatible),
  });
}

export function handoffSpatialInteraction({ interaction, handler } = {}) {
  if (typeof handler !== 'function') {
    throw new TypeError('an interaction handler is required');
  }

  const normalizedInteraction = normalizeSpatialInteractionIntent(interaction);
  return handler(normalizedInteraction);
}
