import { Buffer } from 'node:buffer';

import { getLogger } from '../observability/json-logger.js';
import { createRouteFailureRecord } from './route-failure-schema.js';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_FILENAME_LENGTH = 180;
const MAX_OBJECT_NAME_LENGTH = 512;
const MAX_SESSION_ID_LENGTH = 128;
const MAX_CHAT_TEXT_LENGTH = 12_000;
const MAX_CHAT_FILES = 8;
const MAX_MIME_TYPE_LENGTH = 128;
const MIME_TYPE_PATTERN = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/iu;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;
const ROUTE_LOG_LEVELS = Object.freeze(['error', 'warn', 'info']);
const ROUTE_LOG_LEVEL_SET = new Set(ROUTE_LOG_LEVELS);
const DEFAULT_ROUTE_LOGGER = getLogger('route-safety');

/**
 * @typedef {Record<string, ((metadata: Readonly<Record<string, string | number | boolean | null>>, message: string) => unknown) | undefined>} RouteLogger
 */

/**
 * @typedef {object} RouteFailureOptions
 * @property {RouteLogger | null | undefined} [logger]
 * @property {'error' | 'warn' | 'info'} [level]
 * @property {string} [event]
 * @property {string} [message]
 * @property {unknown} [error]
 * @property {Record<string, unknown>} [context]
 */

function ok(value) {
  return Object.freeze({ ok: true, value: Object.freeze(value) });
}

function invalid(error) {
  return Object.freeze({ ok: false, error });
}

function normalizeMimeType(value, { optional = false } = {}) {
  if (value === undefined && optional) return 'application/octet-stream';
  if (typeof value !== 'string') return null;
  const mimeType = value.trim().toLowerCase();
  if (!mimeType || mimeType.length > MAX_MIME_TYPE_LENGTH || !MIME_TYPE_PATTERN.test(mimeType)) {
    return null;
  }
  return mimeType;
}

function normalizeFilename(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_FILENAME_LENGTH || CONTROL_CHARACTER_PATTERN.test(trimmed)) {
    return null;
  }

  const normalized = trimmed
    .replace(/[\\/]+/gu, '_')
    .replace(/\s+/gu, '_')
    .replace(/\.{2,}/gu, '_')
    .replace(/_+/gu, '_')
    .replace(/^\.+/u, '');

  return normalized || null;
}

export function parseUploadFile(file) {
  if (!file || typeof file !== 'object') return invalid('No file uploaded');

  const originalname = normalizeFilename(file.originalname);
  if (!originalname) return invalid('Invalid upload filename');
  if (!Buffer.isBuffer(file.buffer)) return invalid('Invalid upload body');
  if (file.buffer.length === 0 || file.buffer.length > MAX_UPLOAD_BYTES) {
    return invalid('Upload size must be between 1 byte and 10 MiB');
  }

  const mimetype = normalizeMimeType(file.mimetype);
  if (!mimetype) return invalid('Invalid upload MIME type');

  return ok({ originalname, buffer: file.buffer, mimetype });
}

export function parseStorageObjectName(value) {
  if (typeof value !== 'string') return invalid('Invalid storage object');
  const objectName = value.trim();
  if (
    !objectName ||
    objectName.length > MAX_OBJECT_NAME_LENGTH ||
    CONTROL_CHARACTER_PATTERN.test(objectName) ||
    objectName.includes('\\') ||
    !objectName.startsWith('uploads/')
  ) {
    return invalid('Invalid storage object');
  }

  const segments = objectName.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    return invalid('Invalid storage object');
  }

  return ok({ objectName });
}

function normalizeSessionId(value) {
  if (value === undefined) return 'default';
  if (typeof value !== 'string') return null;
  const sessionId = value.trim();
  if (
    !sessionId ||
    sessionId.length > MAX_SESSION_ID_LENGTH ||
    CONTROL_CHARACTER_PATTERN.test(sessionId)
  ) {
    return null;
  }
  return sessionId;
}

export function parseChatRequestBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return invalid('Chat body must be an object');
  }

  const allowedKeys = new Set(['sessionId', 'text', 'files']);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    return invalid('Chat body contains unsupported fields');
  }

  const sessionId = normalizeSessionId(body.sessionId);
  if (!sessionId) return invalid('Invalid sessionId');

  if (body.text !== undefined && typeof body.text !== 'string') {
    return invalid('Chat text must be a string');
  }
  const text = (body.text ?? '').trim();
  if (text.length > MAX_CHAT_TEXT_LENGTH) return invalid('Chat text is too long');

  if (body.files !== undefined && !Array.isArray(body.files)) {
    return invalid('Chat files must be an array');
  }
  const inputFiles = body.files ?? [];
  if (inputFiles.length > MAX_CHAT_FILES) return invalid('Too many chat files');

  const files = [];
  for (const file of inputFiles) {
    if (!file || typeof file !== 'object' || Array.isArray(file)) {
      return invalid('Invalid chat file reference');
    }
    if (Object.keys(file).some((key) => !['objectName', 'mimeType'].includes(key))) {
      return invalid('Invalid chat file reference');
    }

    const parsedObject = parseStorageObjectName(file.objectName);
    if (!parsedObject.ok) return invalid('Invalid chat file reference');
    const mimeType = normalizeMimeType(file.mimeType, { optional: true });
    if (!mimeType) return invalid('Invalid chat file MIME type');
    files.push(Object.freeze({ objectName: parsedObject.value.objectName, mimeType }));
  }

  if (!text && files.length === 0) return invalid('Chat requires text or a file');

  return ok({ sessionId, text, files: Object.freeze(files) });
}

/**
 * Emit a bounded, structured route-failure record without leaking raw upstream errors.
 *
 * @param {RouteFailureOptions} [options]
 * @returns {boolean}
 */
export function logRouteFailure(options = {}) {
  const {
    logger =
      /** @type {RouteLogger | undefined} */ (globalThis['routeLogger']) ?? DEFAULT_ROUTE_LOGGER,
    level = 'error',
    event,
    message = 'Route operation failed',
    error,
    context = {},
  } = options;

  if (typeof event !== 'string' || !event) throw new TypeError('event is required');
  if (!ROUTE_LOG_LEVEL_SET.has(level)) {
    throw new TypeError('level must be one of: error, warn, info');
  }

  const method = logger?.[level];
  if (typeof method !== 'function') return false;

  const metadata = createRouteFailureRecord({ event, error, context });

  try {
    method.call(logger, metadata, message);
    return true;
  } catch {
    return false;
  }
}
