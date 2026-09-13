import { TARGETS } from '../holographic/evidence-envelope.js';

export const HOLO_CORE_VERSION = '0.2.0';

function finite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
}

function text(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required`);
  return value.trim();
}

function stringSet(value, name) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  const normalized = value.map((item, index) => {
    if (typeof item !== 'string' || !item.trim()) {
      throw new TypeError(`${name}[${index}] must be a non-empty string`);
    }
    return item.trim();
  });
  return Object.freeze([...new Set(normalized)]);
}

function normalizeNodeData(data, index) {
  if (data === undefined) return Object.freeze({});
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new TypeError(`scene node ${index} data must be an object`);
  }
  if (data.requires !== undefined && !Array.isArray(data.requires)) {
    throw new TypeError(`scene node ${index} data.requires must be an array`);
  }
  return Object.freeze({
    ...data,
    ...(data.requires === undefined
      ? {}
      : { requires: stringSet(data.requires, `scene node ${index} data.requires`) }),
  });
}

export function transform(input = {}) {
  const scale = finite(input.scale ?? 1, 'scale');
  if (scale <= 0) throw new RangeError('scale must be greater than zero');
  return Object.freeze({
    x: finite(input.x ?? 0, 'x'),
    y: finite(input.y ?? 0, 'y'),
    z: finite(input.z ?? 0, 'z'),
    rx: finite(input.rx ?? 0, 'rx'),
    ry: finite(input.ry ?? 0, 'ry'),
    rz: finite(input.rz ?? 0, 'rz'),
    scale,
  });
}

export function scene({ id, snapshotId, provenanceRef, nodes = [], metadata = {} } = {}) {
  if (!Array.isArray(nodes)) throw new TypeError('scene nodes must be an array');
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new TypeError('scene metadata must be an object');
  }

  const normalizedNodes = nodes.map((node, index) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      throw new TypeError(`scene node ${index} must be an object`);
    }
    const nodeId = text(String(node.id ?? `node-${index + 1}`), `scene node ${index} id`);
    return Object.freeze({
      id: nodeId,
      kind: node.kind ?? 'content',
      transform: transform(node.transform),
      visible: node.visible !== false,
      data: normalizeNodeData(node.data, index),
    });
  });

  return Object.freeze({
    schema: 'holo.scene.v2',
    id: text(id, 'scene id'),
    snapshotId: text(snapshotId, 'snapshotId'),
    provenanceRef: text(provenanceRef, 'provenanceRef'),
    metadata: Object.freeze({ ...metadata }),
    nodes: Object.freeze(normalizedNodes),
  });
}

export function device({ id, target, capabilities = [], simulated = true } = {}) {
  if (!TARGETS.includes(target)) throw new TypeError(`unsupported holographic target: ${target}`);
  return Object.freeze({
    id: text(id, 'device id'),
    target,
    capabilities: stringSet(capabilities, 'device capabilities'),
    simulated: Boolean(simulated),
  });
}

export function negotiate(sceneSpec, deviceSpec) {
  if (!sceneSpec || sceneSpec.schema !== 'holo.scene.v2') {
    throw new TypeError('invalid scene specification');
  }
  if (!Array.isArray(sceneSpec.nodes)) throw new TypeError('scene nodes must be an array');

  const normalizedDevice = device(deviceSpec);
  const required = stringSet(
    sceneSpec.nodes.flatMap((node, index) => {
      if (!node || typeof node !== 'object' || Array.isArray(node)) {
        throw new TypeError(`scene node ${index} must be an object`);
      }
      const requirements = node.data?.requires ?? [];
      if (!Array.isArray(requirements)) {
        throw new TypeError(`scene node ${index} data.requires must be an array`);
      }
      return requirements;
    }),
    'scene capability requirements',
  );
  const missing = required.filter(
    (capability) => !normalizedDevice.capabilities.includes(capability),
  );
  return Object.freeze({
    compatible: missing.length === 0,
    missing: Object.freeze(missing),
  });
}
