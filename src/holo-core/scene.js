export const HOLO_CORE_VERSION = '0.1.0';

const DEVICE_TYPES = new Set(['projector', 'holomat', 'three-d-platform']);

const finite = (value, name) => {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
};

export function transform(input = {}) {
  return Object.freeze({
    x: finite(input.x ?? 0, 'x'), y: finite(input.y ?? 0, 'y'), z: finite(input.z ?? 0, 'z'),
    rx: finite(input.rx ?? 0, 'rx'), ry: finite(input.ry ?? 0, 'ry'), rz: finite(input.rz ?? 0, 'rz'),
    scale: finite(input.scale ?? 1, 'scale'),
  });
}

export function scene({ id, nodes = [], metadata = {} } = {}) {
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('scene id is required');
  if (!Array.isArray(nodes)) throw new TypeError('scene nodes must be an array');
  return Object.freeze({
    schema: 'holo.scene.v1', id, metadata: Object.freeze({ ...metadata }),
    nodes: Object.freeze(nodes.map((node) => Object.freeze({
      id: node.id, kind: node.kind ?? 'content', transform: transform(node.transform),
      visible: node.visible !== false, data: Object.freeze({ ...(node.data ?? {}) }),
    }))),
  });
}

export function device({ id, type, capabilities = [], simulated = true } = {}) {
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('device id is required');
  if (!DEVICE_TYPES.has(type)) throw new TypeError(`unsupported device type: ${type}`);
  return Object.freeze({ id, type, capabilities: Object.freeze([...new Set(capabilities)]), simulated: Boolean(simulated) });
}

export function negotiate(sceneSpec, deviceSpec) {
  const required = sceneSpec.nodes.flatMap((node) => node.data?.requires ?? []);
  const missing = [...new Set(required)].filter((capability) => !deviceSpec.capabilities.includes(capability));
  return Object.freeze({ compatible: missing.length === 0, missing });
}
