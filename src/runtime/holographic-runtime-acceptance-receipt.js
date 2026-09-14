import { createHash } from 'node:crypto';
import {
  buildRuntimeAcceptanceReceipt,
  fingerprintRuntimeAcceptanceReceipt,
} from './runtime-acceptance-receipt.js';
import { evaluateHolographicAcceptance } from '../holographic/acceptance-gate.js';
import { fingerprintHolographicScene } from '../holographic/scene-fingerprint.js';

const HOLOGRAPHIC_RECEIPT_VERSION = 1;

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value)), 'utf8').digest('hex');
}

/** Bind deployment acceptance to a validated holographic scene without adding execution authority. */
export function buildHolographicRuntimeAcceptanceReceipt({
  acceptance,
  serviceName,
  region,
  envelope,
  scene,
  snapshotId,
  sceneId,
  provenanceRef,
} = {}) {
  const runtimeReceipt = buildRuntimeAcceptanceReceipt({ acceptance, serviceName, region });
  const sceneFingerprint = fingerprintHolographicScene(scene);
  const holographicAcceptance = evaluateHolographicAcceptance({
    envelope,
    scene,
    sceneFingerprint,
    snapshotId,
    sceneId,
    provenanceRef,
  });
  if (!holographicAcceptance.accepted) {
    throw new TypeError('holographic scene failed runtime acceptance binding');
  }

  const body = {
    holographicReceiptVersion: HOLOGRAPHIC_RECEIPT_VERSION,
    runtimeReceipt,
    runtimeReceiptFingerprint: fingerprintRuntimeAcceptanceReceipt(runtimeReceipt),
    sceneFingerprint,
    snapshotId,
    sceneId,
    provenanceRef,
    holographicAcceptance,
    safety: { authoritative: false, physicalActuation: false, advisoryOnly: true },
  };
  return Object.freeze({ ...body, receiptFingerprint: fingerprint(body) });
}

export function validateHolographicRuntimeAcceptanceReceipt(receipt) {
  try {
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return false;
    if (receipt.holographicReceiptVersion !== HOLOGRAPHIC_RECEIPT_VERSION) return false;
    if (!/^[a-f0-9]{64}$/.test(receipt.sceneFingerprint)) return false;
    if (!/^[a-f0-9]{64}$/.test(receipt.runtimeReceiptFingerprint)) return false;
    if (!/^[a-f0-9]{64}$/.test(receipt.receiptFingerprint)) return false;
    if (
      receipt.safety?.authoritative !== false ||
      receipt.safety?.physicalActuation !== false ||
      receipt.safety?.advisoryOnly !== true
    ) {
      return false;
    }
    if (receipt.holographicAcceptance?.accepted !== true) return false;
    if (
      receipt.runtimeReceiptFingerprint !==
      fingerprintRuntimeAcceptanceReceipt(receipt.runtimeReceipt)
    ) {
      return false;
    }
    const body = { ...receipt };
    delete body.receiptFingerprint;
    return receipt.receiptFingerprint === fingerprint(body);
  } catch {
    return false;
  }
}

export { HOLOGRAPHIC_RECEIPT_VERSION };
