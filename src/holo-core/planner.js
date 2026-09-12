import { negotiate, scene, transform } from './scene.js';
import { interpretHolographicIntent } from './intent.js';

function normalizeIntent(intent) {
  if (typeof intent === 'string') {
    return interpretHolographicIntent({ prompt: intent });
  }
  if (intent && typeof intent === 'object') {
    return interpretHolographicIntent(intent);
  }
  throw new TypeError('intent is required');
}

export function planSpatialScene({ intent, assets = [], device } = {}) {
  if (!Array.isArray(assets)) throw new TypeError('assets must be an array');
  if (!device) throw new TypeError('device is required');

  const normalizedIntent = normalizeIntent(intent);
  if (normalizedIntent.displayType !== device.type) {
    throw new Error(
      `Intent display type ${normalizedIntent.displayType} does not match device type ${device.type}.`,
    );
  }

  const slug =
    normalizedIntent.prompt
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'default';

  const sceneSpec = scene({
    id: `plan-${slug}`,
    metadata: {
      intent: normalizedIntent.prompt,
      sceneType: normalizedIntent.sceneType,
      displayType: normalizedIntent.displayType,
      constraints: normalizedIntent.constraints,
      animation: normalizedIntent.animation,
      interaction: normalizedIntent.interaction,
      planner: 'holo-core-v1',
    },
    nodes: assets.map((asset, index) => ({
      id: String(asset.id ?? `asset-${index + 1}`),
      kind: asset.kind ?? 'content',
      transform: transform({
        x: index * 0.5,
        z: index * -0.25,
        scale: asset.scale ?? 1,
      }),
      data: {
        assetId: asset.id ?? `asset-${index + 1}`,
        requires: asset.requires ?? [],
      },
    })),
  });

  const compatibility = negotiate(sceneSpec, device);
  return Object.freeze({ scene: sceneSpec, device, intent: normalizedIntent, compatibility });
}
