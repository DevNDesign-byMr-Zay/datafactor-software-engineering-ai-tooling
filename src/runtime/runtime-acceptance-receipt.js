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

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function requireNonEmptyString(value, name) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) throw new TypeError(`${name} must be a non-empty string`);
  return normalized;
}

function normalizeOptionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
