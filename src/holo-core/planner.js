import { buildHolographicEvidenceEnvelope } from '../holographic/evidence-envelope.js';
import { interpretHolographicIntent } from './intent.js';
import { device as normalizeDevice, negotiate, scene, transform } from './scene.js';

function normalizeIntent(intent) {
  if (typeof intent === 'string') return interpretHolographicIntent({ prompt: intent });
  if (intent && typeof intent === 'object') return interpretHolographicIntent(intent);
  throw new TypeError('intent is required');
}

export function planSpatialScene({ intent, assets = [], device, snapshotId, provenanceRef } = {}) {
  if (!Array.isArray(assets)) throw new TypeError('assets must be an array');
  if (!device) throw new TypeError('device is required');

  const normalizedIntent = normalizeIntent(intent);
  const normalizedDevice = normalizeDevice(device);
  if (normalizedIntent.target !== normalizedDevice.target) {
    throw new Error(
      `Intent target ${normalizedIntent.target} does not match device target ${normalizedDevice.target}.`,
    );
  }

  const slug =
    normalizedIntent.prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'default';

  const sceneSpec = scene({
    id: `plan-${slug}`,
    snapshotId,
    provenanceRef,
    metadata: {
      intent: normalizedIntent.prompt,
      sceneType: normalizedIntent.sceneType,
      target: normalizedIntent.target,
      constraints: normalizedIntent.constraints,
      animation: normalizedIntent.animation,
      interaction: normalizedIntent.interaction,
      planner: 'holo-core-v2',
    },
    nodes: assets.map((asset, index) => ({
      id: String(asset.id ?? `asset-${index + 1}`),
      kind: asset.kind ?? 'content',
      visible: asset.visible !== false,
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

  const compatibility = negotiate(sceneSpec, normalizedDevice);
  const evidence = buildHolographicEvidenceEnvelope({
    snapshotId: sceneSpec.snapshotId,
    sceneId: sceneSpec.id,
    provenanceRef: sceneSpec.provenanceRef,
    target: normalizedDevice.target,
    payload: sceneSpec,
  });

  return Object.freeze({
    scene: sceneSpec,
    device: normalizedDevice,
    intent: normalizedIntent,
    compatibility,
    evidence,
  });
}
