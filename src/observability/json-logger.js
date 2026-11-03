import process from 'node:process';

const LEVELS = Object.freeze(['error', 'warn', 'info']);
const LEVEL_SET = new Set(LEVELS);
const RESERVED_METADATA_KEYS = new Set([
  'timestamp',
  'level',
  'logger',
  'message',
  '__proto__',
  'prototype',
  'constructor',
]);
const SENSITIVE_METADATA_KEY =
  /secret|token|api[_-]?key|auth|pass(?:word|phrase)?|credential|cookie|session|bearer|private[_-]?key/iu;

function boundedName(value) {
  if (typeof value !== 'string') throw new TypeError('logger name must be a string');
  const name = value.trim();
  if (!name || name.length > 96) throw new TypeError('logger name must be 1-96 characters');
  return name;
}

function boundedMessage(value) {
  if (typeof value !== 'string') return '';
  return value.length <= 512 ? value : value.slice(0, 512);
}

function boundedMetadata(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('log metadata must be a plain object');
  }

  const result = {};
  let descriptors;
  try {
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch {
    // Keep writing the trusted envelope if hostile proxy metadata cannot be read.
    return result;
  }

  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (
      !descriptor.enumerable ||
      !Object.hasOwn(descriptor, 'value') ||
      RESERVED_METADATA_KEYS.has(key) ||
      SENSITIVE_METADATA_KEY.test(key)
    ) {
      continue;
    }

    const item = descriptor.value;
    if (typeof item === 'string') result[key] = item.slice(0, 256);
    else if (typeof item === 'number' && Number.isFinite(item)) result[key] = item;
    else if (typeof item === 'boolean' || item === null) result[key] = item;
  }
  return result;
}

export function getLogger(
  name,
  { sink = process.stdout, now = () => new Date().toISOString() } = {},
) {
  const loggerName = boundedName(name);
  if (!sink || typeof sink.write !== 'function')
    throw new TypeError('logger sink must provide write()');
  if (typeof now !== 'function') throw new TypeError('logger clock must be a function');

  function emit(level, metadata, message) {
    if (!LEVEL_SET.has(level)) throw new TypeError('unsupported log level');
    const record = {
      ...boundedMetadata(metadata),
      timestamp: now(),
      level,
      logger: loggerName,
      message: boundedMessage(message),
    };
    sink.write(`${JSON.stringify(record)}\n`);
  }

  return Object.freeze({
    error(metadata, message = '') {
      emit('error', metadata, message);
    },
    warn(metadata, message = '') {
      emit('warn', metadata, message);
    },
    info(metadata, message = '') {
      emit('info', metadata, message);
    },
  });
}
