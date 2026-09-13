import { createHash } from 'node:crypto';
import { negotiate } from './scene.js';

export const HOLO_ACCEPTANCE_SCHEMA = 'holo.acceptance.v1';

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function createSpatialAcceptanceReceipt({ intent, sceneSpec, device } = {}) {
  if (!intent || typeof intent !== 'object') throw new TypeError('normalized intent is required');
  if (!sceneSpec || typeof sceneSpec !== 'object')
    throw new TypeError('scene specification is required');
  if (!device || typeof device !== 'object') throw new TypeError('device is required');

  const compatibility = negotiate(sceneSpec, device);
  const receipt = {
    schema: HOLO_ACCEPTANCE_SCHEMA,
    intent: Object.freeze({
      prompt: intent.prompt,
      sceneType: intent.sceneType,
      displayType: intent.displayType,
    }),
    sceneId: sceneSpec.id,
    sceneSchema: sceneSpec.schema,
    deviceId: device.id,
    deviceType: device.type,
    compatibility,
    accepted: compatibility.compatible && intent.displayType === device.type,
  };
  return Object.freeze({ ...receipt, fingerprint: fingerprint(receipt) });
}
