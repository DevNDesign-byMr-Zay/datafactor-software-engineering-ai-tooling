import { createHash } from 'node:crypto';

const RECEIPT_VERSION = 1;

/**
 * Convert a successful runtime-acceptance result into a small, stable evidence
 * contract. Raw command output is deliberately excluded so receipts remain
 * safe to persist and compare without carrying logs, tokens, or environment
 * details into downstream tooling.
 */
export function buildRuntimeAcceptanceReceipt(input = {}) {
  const builder = requirePlainObject(input, 'receipt builder input');
  const acceptance = requirePlainObject(
    readOwnData(builder, 'acceptance', 'receipt builder input'),
    'acceptance',
  );
  const serviceName = readOwnData(builder, 'serviceName', 'receipt builder input');
  const region = readOwnData(builder, 'region', 'receipt builder input');

  if (readOwnData(acceptance, 'accepted', 'acceptance') !== true) {
    throw new TypeError('acceptance must be marked accepted');
  }

  const bootstrap = requirePlainObject(
    readOwnData(acceptance, 'bootstrap', 'acceptance'),
    'acceptance.bootstrap',
  );
  const release = requirePlainObject(
    readOwnData(acceptance, 'release', 'acceptance'),
    'acceptance.release',
  );
  const service = requirePlainObject(
    readOwnData(release, 'service', 'acceptance.release'),
    'acceptance.release.service',
  );

  const normalizedServiceName = requireNonEmptyString(
    serviceName ?? readOwnData(service, 'serviceName', 'acceptance.release.service'),
    'serviceName',
  );

  const latestReadyRevisionName = requireNonEmptyString(
    readOwnData(service, 'latestReadyRevisionName', 'acceptance.release.service'),
    'latestReadyRevisionName',
  );

  const traffic = normalizeTraffic(readOwnData(service, 'traffic', 'acceptance.release.service'));

  return deepFreeze({
    contractVersion: RECEIPT_VERSION,
    accepted: true,
    service: {
      name: normalizedServiceName,
      region: region === undefined ? null : requireNonEmptyString(region, 'region'),
      latestReadyRevisionName,
      traffic,
      url: normalizeOptionalString(readOwnData(service, 'url', 'acceptance.release.service')),
    },
    bootstrap: summarizeBootstrap(bootstrap),
    releaseEvidence: {
      stage: requireNonEmptyString(
        readOwnData(release, 'stage', 'acceptance.release'),
        'release.stage',
      ),
      exitCode: normalizeExitCode(readOwnData(release, 'exitCode', 'acceptance.release')),
    },
  });
}

export function serializeRuntimeAcceptanceReceipt(receipt) {
  return JSON.stringify(normalizeReceiptForSerialization(receipt));
}

export function fingerprintRuntimeAcceptanceReceipt(receipt) {
  return createHash('sha256')
    .update(serializeRuntimeAcceptanceReceipt(receipt), 'utf8')
    .digest('hex');
}

function normalizeReceiptForSerialization(receipt) {
  const value = readExactDataObject(
    receipt,
    ['contractVersion', 'accepted', 'service', 'bootstrap', 'releaseEvidence'],
    'receipt',
  );

  if (value.contractVersion !== RECEIPT_VERSION) {
    throw new TypeError(`receipt.contractVersion must equal ${RECEIPT_VERSION}`);
  }
  if (value.accepted !== true) {
    throw new TypeError('receipt.accepted must be true');
  }

  const service = readExactDataObject(
    value.service,
    ['name', 'region', 'latestReadyRevisionName', 'traffic', 'url'],
    'receipt.service',
  );
  const bootstrap = readExactDataObject(
    value.bootstrap,
    ['stage', 'readiness', 'failedStep'],
    'receipt.bootstrap',
  );
  const releaseEvidence = readExactDataObject(
    value.releaseEvidence,
    ['stage', 'exitCode'],
    'receipt.releaseEvidence',
  );

  const readiness = readDenseDataArray(bootstrap.readiness, 'receipt.bootstrap.readiness', true);
  const normalizedBootstrap = {
    stage: normalizeNullableString(bootstrap.stage, 'receipt.bootstrap.stage'),
    readiness: readiness.map((step, index) => normalizeReceiptReadinessStep(step, index)),
  };

  if (Object.hasOwn(bootstrap, 'failedStep')) {
    normalizedBootstrap.failedStep = normalizeNullableString(
      bootstrap.failedStep,
      'receipt.bootstrap.failedStep',
    );
  }

  return {
    contractVersion: RECEIPT_VERSION,
    accepted: true,
    service: {
      name: requireNonEmptyString(service.name, 'receipt.service.name'),
      region: normalizeNullableString(service.region, 'receipt.service.region'),
      latestReadyRevisionName: requireNonEmptyString(
        service.latestReadyRevisionName,
        'receipt.service.latestReadyRevisionName',
      ),
      traffic: normalizeReceiptTraffic(service.traffic),
      url: normalizeNullableString(service.url, 'receipt.service.url'),
    },
    bootstrap: normalizedBootstrap,
    releaseEvidence: {
      stage: requireNonEmptyString(releaseEvidence.stage, 'receipt.releaseEvidence.stage'),
      exitCode: normalizeReceiptExitCode(releaseEvidence.exitCode),
    },
  };
}

function normalizeReceiptTraffic(traffic) {
  return readDenseDataArray(traffic, 'receipt.service.traffic', true)
    .map((entry, index) => {
      const value = readExactDataObject(
        entry,
        ['revisionName', 'percent', 'tag', 'url'],
        `receipt.service.traffic[${index}]`,
      );

      return {
        revisionName: requireNonEmptyString(
          value.revisionName,
          `receipt.service.traffic[${index}].revisionName`,
        ),
        percent: normalizeNullableFiniteNumber(
          value.percent,
          `receipt.service.traffic[${index}].percent`,
        ),
        tag: normalizeNullableString(value.tag, `receipt.service.traffic[${index}].tag`),
        url: normalizeNullableString(value.url, `receipt.service.traffic[${index}].url`),
      };
    })
    .sort((left, right) => trafficSortKey(left).localeCompare(trafficSortKey(right)));
}

function normalizeReceiptReadinessStep(step, index) {
  const value = readExactDataObject(
    step,
    ['name', 'status'],
    `receipt.bootstrap.readiness[${index}]`,
  );

  return {
    name: normalizeNullableString(value.name, `receipt.bootstrap.readiness[${index}].name`),
    status: requireNonEmptyString(value.status, `receipt.bootstrap.readiness[${index}].status`),
  };
}

function trafficSortKey(entry) {
  return [entry.revisionName, entry.tag ?? '', entry.url ?? '', String(entry.percent ?? '')].join(
    '\u0000',
  );
}

function summarizeBootstrap(bootstrap) {
  const stage = readOwnData(bootstrap, 'stage', 'acceptance.bootstrap');
  const readinessValue = readOwnData(bootstrap, 'readiness', 'acceptance.bootstrap');
  const failedStep = readOwnData(bootstrap, 'failedStep', 'acceptance.bootstrap');
  const readiness = Array.isArray(readinessValue)
    ? readDenseDataArray(readinessValue, 'acceptance.bootstrap.readiness', false).map(
        summarizeReadinessStep,
      )
    : [];

  const summary = {
    stage: normalizeOptionalString(stage),
    readiness,
  };

  if (failedStep !== undefined && failedStep !== null) {
    summary.failedStep = normalizeOptionalString(failedStep);
  }

  return summary;
}

function summarizeReadinessStep(step, index) {
  if (!step || typeof step !== 'object' || Array.isArray(step)) {
    return { status: 'invalid' };
  }

  const value = requirePlainObject(step, `acceptance.bootstrap.readiness[${index}]`);
  return {
    name: normalizeOptionalString(
      readOwnData(value, 'name', `acceptance.bootstrap.readiness[${index}]`),
    ),
    status:
      normalizeOptionalString(
        readOwnData(value, 'status', `acceptance.bootstrap.readiness[${index}]`),
      ) ?? 'unknown',
  };
}

function normalizeTraffic(traffic) {
  if (!Array.isArray(traffic)) return [];

  return readDenseDataArray(traffic, 'acceptance.release.service.traffic', false)
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const value = requirePlainObject(entry, `acceptance.release.service.traffic[${index}]`);
      const revisionName = normalizeOptionalString(
        readOwnData(value, 'revisionName', `acceptance.release.service.traffic[${index}]`),
      );
      if (!revisionName) return null;

      const percentValue = readOwnData(
        value,
        'percent',
        `acceptance.release.service.traffic[${index}]`,
      );
      const numericPercent = primitiveNumber(percentValue);

      return {
        revisionName,
        percent: Number.isFinite(numericPercent) ? numericPercent : null,
        tag: normalizeOptionalString(
          readOwnData(value, 'tag', `acceptance.release.service.traffic[${index}]`),
        ),
        url: normalizeOptionalString(
          readOwnData(value, 'url', `acceptance.release.service.traffic[${index}]`),
        ),
      };
    })
    .filter(Boolean);
}

function normalizeExitCode(value) {
  const exitCode = primitiveNumber(value);
  if (!Number.isInteger(exitCode)) {
    throw new TypeError('release.exitCode must be an integer');
  }
  return exitCode;
}

function normalizeReceiptExitCode(value) {
  if (!Number.isInteger(value)) {
    throw new TypeError('receipt.releaseEvidence.exitCode must be an integer');
  }
  return value;
}

function primitiveNumber(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return Number.NaN;
  return Number(value);
}

function isObjectPrototype(prototype) {
  if (prototype === null || prototype === Object.prototype) return true;
  if (Object.getPrototypeOf(prototype) !== null) return false;

  const constructorDescriptor = Object.getOwnPropertyDescriptor(prototype, 'constructor');
  return Boolean(
    constructorDescriptor &&
      'value' in constructorDescriptor &&
      typeof constructorDescriptor.value === 'function' &&
      constructorDescriptor.value.name === 'Object',
  );
}

function requirePlainObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  if (!isObjectPrototype(Object.getPrototypeOf(value))) {
    throw new TypeError(`${name} must be a plain object`);
  }
  return value;
}

function readOwnData(value, key, path) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) return undefined;
  if (!descriptor.enumerable) {
    throw new TypeError(`${path}.${key} must be enumerable data`);
  }
  if ('get' in descriptor || 'set' in descriptor) {
    throw new TypeError(`${path}.${key} must not use accessors`);
  }
  return descriptor.value;
}

function readExactDataObject(value, allowedKeys, name) {
  const object = requirePlainObject(value, name);
  if (Object.getOwnPropertySymbols(object).length > 0) {
    throw new TypeError(`${name} must not contain symbol properties`);
  }

  const allowed = new Set(allowedKeys);
  const descriptors = Object.getOwnPropertyDescriptors(object);
  const copy = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!allowed.has(key)) {
      throw new TypeError(`${name} contains unsupported field: ${key}`);
    }
    if (!descriptor.enumerable) {
      throw new TypeError(`${name}.${key} must be enumerable data`);
    }
    if ('get' in descriptor || 'set' in descriptor) {
      throw new TypeError(`${name}.${key} must not use accessors`);
    }
    copy[key] = descriptor.value;
  }
  return copy;
}

function readDenseDataArray(value, name, rejectExtraProperties) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${name} must not contain symbol properties`);
  }

  const allowedKeys = new Set(['length']);
  const copy = [];
  for (let index = 0; index < value.length; index += 1) {
    const key = String(index);
    allowedKeys.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) throw new TypeError(`${name} must not contain sparse entries`);
    if (!descriptor.enumerable || 'get' in descriptor || 'set' in descriptor) {
      throw new TypeError(`${name}[${index}] must be enumerable data`);
    }
    copy.push(descriptor.value);
  }

  if (
    rejectExtraProperties &&
    Reflect.ownKeys(value).some((key) => typeof key !== 'string' || !allowedKeys.has(key))
  ) {
    throw new TypeError(`${name} must not contain extra properties`);
  }
  return copy;
}

function requireNonEmptyString(value, name) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) throw new TypeError(`${name} must be a non-empty string`);
  return normalized;
}

function normalizeNullableString(value, name) {
  if (value === null) return null;
  return requireNonEmptyString(value, name);
}

function normalizeNullableFiniteNumber(value, name) {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number or null`);
  }
  return value;
}

function normalizeOptionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object') return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  if (!Object.isFrozen(value)) Object.freeze(value);
  return value;
}
