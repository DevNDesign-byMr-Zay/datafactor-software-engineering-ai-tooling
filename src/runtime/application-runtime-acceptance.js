import { executeApplicationBootstrapWithReadiness } from '../bootstrap/application-bootstrap-readiness.js';
import { inspectCloudRunRelease } from '../deployment/cloud-run-release-evidence.js';
import {
  buildRuntimeAcceptanceReceipt,
  fingerprintRuntimeAcceptanceReceipt,
} from './runtime-acceptance-receipt.js';

/**
 * Execute the maintained application bootstrap/readiness path, then capture
 * mechanically returned Cloud Run revision/traffic evidence for the deployed
 * service. This does not deploy or move traffic; it only joins already
 * maintained runtime acceptance boundaries into one evidence record.
 *
 * `release` remains operational/debug evidence and can contain raw process
 * details. Only `receipt` is the durable acceptance contract safe to persist;
 * downstream automation may compare `receiptFingerprint` without parsing logs.
 */
export async function executeApplicationRuntimeAcceptance(plan, options = {}) {
  let serviceName;
  try {
    serviceName = requireNonEmptyString(options.serviceName, 'serviceName');
  } catch (cause) {
    throw buildConfigurationError(cause, 'serviceName');
  }

  let region = options.region;
  if (region !== undefined) {
    try {
      region = requireNonEmptyString(region, 'region');
    } catch (cause) {
      throw buildConfigurationError(cause, 'region');
    }
  }

  const execFile = options.execFile;

  let bootstrap;
  try {
    bootstrap = await executeApplicationBootstrapWithReadiness(plan, options);
  } catch (cause) {
    const error = new Error(
      `application runtime acceptance failed at ${cause?.stage ?? 'bootstrap'}: ${cause.message}`,
      { cause },
    );
    error.stage = cause?.stage ?? 'bootstrap';
    error.bootstrap = cause?.bootstrap ?? null;
    error.readiness = Array.isArray(cause?.readiness) ? [...cause.readiness] : [];
    error.failedStep = cause?.failedStep ?? null;
    throw error;
  }

  let release;
  try {
    release = await inspectCloudRunRelease({
      serviceName,
      ...(region === undefined ? {} : { region }),
      execFile,
    });
    validateAcceptedReleaseEvidence(release, serviceName);
  } catch (cause) {
    const error = new Error(
      `application runtime acceptance failed at release evidence: ${cause.message}`,
      { cause },
    );
    error.stage = 'release-evidence';
    error.bootstrap = bootstrap;
    error.releaseEvidence = cause?.evidence ?? release ?? null;
    throw error;
  }

  const acceptance = {
    bootstrap,
    release,
    accepted: true,
  };

  let receipt;
  let receiptFingerprint;
  try {
    receipt = buildRuntimeAcceptanceReceipt({ acceptance, serviceName, region });
    receiptFingerprint = fingerprintRuntimeAcceptanceReceipt(receipt);
  } catch (cause) {
    const error = new Error(
      `application runtime acceptance failed at durable receipt: ${cause.message}`,
      { cause },
    );
    error.stage = 'receipt';
    error.bootstrap = bootstrap;
    error.releaseEvidence = release;
    throw error;
  }

  return {
    ...acceptance,
    receipt,
    receiptFingerprint,
  };
}

function validateAcceptedReleaseEvidence(release, expectedServiceName) {
  if (!release || typeof release !== 'object' || Array.isArray(release)) {
    throw new TypeError('release evidence must be an object');
  }

  const service = release.service;
  if (!service || typeof service !== 'object' || Array.isArray(service)) {
    throw new TypeError('release service evidence must be an object');
  }

  const actualServiceName = requireNonEmptyString(
    service.serviceName,
    'release.service.serviceName',
  );
  if (actualServiceName !== expectedServiceName) {
    throw new TypeError(
      `release serviceName ${actualServiceName} does not match requested serviceName ${expectedServiceName}`,
    );
  }

  const latestReadyRevisionName = requireNonEmptyString(
    service.latestReadyRevisionName,
    'release.service.latestReadyRevisionName',
  );

  if (!Array.isArray(service.traffic) || service.traffic.length === 0) {
    throw new TypeError('release.service.traffic must contain at least one revision');
  }

  const latestReadyTraffic = service.traffic.find(
    (entry) =>
      entry?.revisionName === latestReadyRevisionName
      && Number.isFinite(Number(entry?.percent))
      && Number(entry.percent) > 0,
  );
  if (!latestReadyTraffic) {
    throw new TypeError(
      'release.service.traffic must route a positive percent to latestReadyRevisionName',
    );
  }
}

function buildConfigurationError(cause, field) {
  const error = new Error(
    `application runtime acceptance failed at configuration: ${cause.message}`,
    {
      cause,
    },
  );
  error.stage = 'configuration';
  error.field = field;
  error.bootstrap = null;
  return error;
}

function requireNonEmptyString(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}
