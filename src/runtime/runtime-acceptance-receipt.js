import { createHash } from 'node:crypto';

const RECEIPT_VERSION = 1;

/**
 * Convert a successful runtime-acceptance result into a small, stable evidence
 * contract. Raw command output is deliberately excluded so receipts remain
 * safe to persist and compare without carrying logs, tokens, or environment
 * details into downstream tooling.
 */
export function buildRuntimeAcceptanceReceipt({ acceptance, serviceName, region } = {}) {
  if (!acceptance || typeof acceptance !== 'object' || Array.isArray(acceptance)) {
    throw new TypeError('acceptance must be an object');
  }

  if (acceptance.accepted !== true) {
    throw new TypeError('acceptance must be marked accepted');
  }

  const bootstrap = requireObject(acceptance.bootstrap, 'acceptance.bootstrap');
  const release = requireObject(acceptance.release, 'acceptance.release');
  const service = requireObject(release.service, 'acceptance.release.service');

  const normalizedServiceName = requireNonEmptyString(
    serviceName ?? service.serviceName,
    'serviceName',
  );

  const latestReadyRevisionName = requireNonEmptyString(
    service.latestReadyRevisionName,
    'latestReadyRevisionName',
  );

  const traffic = normalizeTraffic(service.traffic);

  return {
    contractVersion: RECEIPT_VERSION,
    accepted: true,
    service: {
      name: normalizedServiceName,
      region: region === undefined ? null : requireNonEmptyString(region, 'region'),
      latestReadyRevisionName,
      traffic,
      url: normalizeOptionalString(service.url),
    },
    bootstrap: summarizeBootstrap(bootstrap),
    releaseEvidence: {
      stage: requireNonEmptyString(release.stage, 'release.stage'),
      exitCode: normalizeExitCode(release.exitCode),
    },
  };
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
  const value = requireObject(receipt, 'receipt');
  assertAllowedKeys(
    value,
    ['contractVersion', 'accepted', 'service', 'bootstrap', 'releaseEvidence'],
    'receipt',
  );

  if (value.contractVersion !== RECEIPT_VERSION) {
    throw new TypeError(`receipt.contractVersion must equal ${RECEIPT_VERSION}`);
  }
  if (value.accepted !== true) {
    throw new TypeError('receipt.accepted must be true');
  }

  const service = requireObject(value.service, 'receipt.service');
  assertAllowedKeys(
    service,
    ['name', 'region', 'latestReadyRevisionName', 'traffic', 'url'],
    'receipt.service',
  );

  const bootstrap = requireObject(value.bootstrap, 'receipt.bootstrap');
  assertAllowedKeys(bootstrap, ['stage', 'readiness', 'failedStep'], 'receipt.bootstrap');

  const releaseEvidence = requireObject(value.releaseEvidence, 'receipt.releaseEvidence');
  assertAllowedKeys(releaseEvidence, ['stage', 'exitCode'], 'receipt.releaseEvidence');

  const normalizedBootstrap = {
    stage: normalizeNullableString(bootstrap.stage, 'receipt.bootstrap.stage'),
    readiness: requireArray(bootstrap.readiness, 'receipt.bootstrap.readiness').map((step, index) =>
      normalizeReceiptReadinessStep(step, index),
    ),
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
  return requireArray(traffic, 'receipt.service.traffic')
    .map((entry, index) => {
      const value = requireObject(entry, `receipt.service.traffic[${index}]`);
      assertAllowedKeys(
        value,
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
  const value = requireObject(step, `receipt.bootstrap.readiness[${index}]`);
  assertAllowedKeys(value, ['name', 'status'], `receipt.bootstrap.readiness[${index}]`);

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
  const summary = {
    stage: normalizeOptionalString(bootstrap.stage),
    readiness: Array.isArray(bootstrap.readiness)
      ? bootstrap.readiness.map(summarizeReadinessStep)
      : [],
  };

  if (bootstrap.failedStep !== undefined && bootstrap.failedStep !== null) {
    summary.failedStep = normalizeOptionalString(bootstrap.failedStep);
  }

  return summary;
}

function summarizeReadinessStep(step) {
  if (!step || typeof step !== 'object' || Array.isArray(step)) {
    return { status: 'invalid' };
  }

  return {
    name: normalizeOptionalString(step.name),
    status: normalizeOptionalString(step.status) ?? 'unknown',
  };
}

function normalizeTraffic(traffic) {
  if (!Array.isArray(traffic)) return [];

  return traffic
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;

      const revisionName = normalizeOptionalString(entry.revisionName);
      if (!revisionName) return null;

      return {
        revisionName,
        percent: Number.isFinite(Number(entry.percent)) ? Number(entry.percent) : null,
        tag: normalizeOptionalString(entry.tag),
        url: normalizeOptionalString(entry.url),
      };
    })
    .filter(Boolean);
}

function normalizeExitCode(value) {
  const exitCode = Number(value);
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

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function requireArray(value, name) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array`);
  }
  return value;
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

function assertAllowedKeys(value, allowedKeys, name) {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new TypeError(`${name} contains unsupported field: ${key}`);
    }
  }
}

function normalizeOptionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
