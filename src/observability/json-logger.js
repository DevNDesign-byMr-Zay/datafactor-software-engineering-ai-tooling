import process from 'node:process';

const LEVELS = Object.freeze(['error', 'warn', 'info']);
const LEVEL_SET = new Set(LEVELS);

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
  for (const [key, item] of Object.entries(value)) {
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
      timestamp: now(),
      level,
      logger: loggerName,
      message: boundedMessage(message),
      ...boundedMetadata(metadata),
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
