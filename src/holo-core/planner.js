import { negotiate, scene, transform } from './scene.js';

export function planSpatialScene({ intent, assets = [], device }) {
  if (typeof intent !== 'string' || !intent.trim()) {
    throw new TypeError('intent is required');
  }
  if (!Array.isArray(assets)) throw new TypeError('assets must be an array');
  if (!device) throw new TypeError('device is required');

  const slug =
    intent
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'default';

  const sceneSpec = scene({
    id: `plan-${slug}`,
    metadata: { intent: intent.trim(), planner: 'datafactor-holo-core-v1' },
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
  return Object.freeze({ scene: sceneSpec, device, compatibility });
}
