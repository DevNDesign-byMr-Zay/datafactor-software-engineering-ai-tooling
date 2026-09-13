import { normalizeSpatialInteractionIntent } from './interaction.js';
import { device as normalizeDevice, negotiate, scene } from './scene.js';

export function orchestrateSpatialScene({ sceneSpec, devices = [] } = {}) {
  if (!sceneSpec || sceneSpec.schema !== 'holo.scene.v2') {
    throw new TypeError('a HoloCore v2 scene is required');
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
      target: target.target,
      compatible: compatibility.compatible,
      missing: compatibility.missing,
      status: compatibility.compatible ? 'ready' : 'blocked',
    });
  });

  return Object.freeze({
    sceneId: normalizedScene.id,
    snapshotId: normalizedScene.snapshotId,
    provenanceRef: normalizedScene.provenanceRef,
    routes: Object.freeze(routes),
    ready: routes.some((route) => route.compatible),
  });
}

export function handoffSpatialInteraction({ interaction, handler } = {}) {
  if (typeof handler !== 'function') throw new TypeError('an interaction handler is required');
  return handler(normalizeSpatialInteractionIntent(interaction));
}
