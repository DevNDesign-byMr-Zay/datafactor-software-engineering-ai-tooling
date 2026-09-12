import { negotiate, scene } from './scene.js';

export function orchestrateSpatialScene({ sceneSpec, devices = [] } = {}) {
  if (!sceneSpec || sceneSpec.schema !== 'holo.scene.v1') {
    throw new TypeError('a HoloCore scene is required');
  }
  if (!Array.isArray(devices) || devices.length === 0) {
    throw new TypeError('at least one device is required');
  }

  const normalizedScene = scene(sceneSpec);
  const routes = devices.map((device) => {
    const compatibility = negotiate(normalizedScene, device);
    return Object.freeze({
      deviceId: device.id,
      deviceType: device.type,
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
