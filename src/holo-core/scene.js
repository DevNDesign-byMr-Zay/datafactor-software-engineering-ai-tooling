export const HOLO_CORE_VERSION = '0.1.0';

const DEVICE_TYPES = new Set(['projector', 'holomat', 'three-d-platform']);

const finite = (value, name) => {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
};

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

export function scene({ id, nodes = [], metadata = {} } = {}) {
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('scene id is required');
  if (!Array.isArray(nodes)) throw new TypeError('scene nodes must be an array');
  const normalizedNodes = nodes.map((node, index) => {
    if (!node || typeof node !== 'object')
      throw new TypeError(`scene node ${index} must be an object`);
    const nodeId = String(node.id ?? `node-${index + 1}`).trim();
    if (!nodeId) throw new TypeError(`scene node ${index} id is required`);
    return Object.freeze({
      id: nodeId,
      kind: node.kind ?? 'content',
      transform: transform(node.transform),
      visible: node.visible !== false,
      data: Object.freeze({ ...(node.data ?? {}) }),
    });
  });
  return Object.freeze({
    schema: 'holo.scene.v1',
    id: id.trim(),
    metadata: Object.freeze({ ...metadata }),
    nodes: Object.freeze(normalizedNodes),
  });
}

export function device({ id, type, capabilities = [], simulated = true } = {}) {
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('device id is required');
  if (!DEVICE_TYPES.has(type)) throw new TypeError(`unsupported device type: ${type}`);
  if (!Array.isArray(capabilities)) throw new TypeError('device capabilities must be an array');
  return Object.freeze({
    id: id.trim(),
    type,
    capabilities: Object.freeze([...new Set(capabilities.map(String))]),
    simulated: Boolean(simulated),
  });
}

export function negotiate(sceneSpec, deviceSpec) {
  if (!sceneSpec || sceneSpec.schema !== 'holo.scene.v1')
    throw new TypeError('invalid scene specification');
  if (!deviceSpec || !DEVICE_TYPES.has(deviceSpec.type))
    throw new TypeError('invalid device specification');
  const required = sceneSpec.nodes.flatMap((node) => node.data?.requires ?? []);
  const missing = [...new Set(required.map(String))].filter(
    (capability) => !deviceSpec.capabilities.includes(capability),
  );
  return Object.freeze({ compatible: missing.length === 0, missing });
}
