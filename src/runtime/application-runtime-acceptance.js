import { executeApplicationBootstrapWithReadiness } from '../bootstrap/application-bootstrap-readiness.js';
import { inspectCloudRunRelease } from '../deployment/cloud-run-release-evidence.js';

/**
 * Execute the maintained application bootstrap/readiness path, then capture
 * mechanically returned Cloud Run revision/traffic evidence for the deployed
 * service. This does not deploy or move traffic; it only joins already
 * maintained runtime acceptance boundaries into one evidence record.
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
  } catch (cause) {
    const error = new Error(
      `application runtime acceptance failed at release evidence: ${cause.message}`,
      { cause },
    );
    error.stage = 'release-evidence';
    error.bootstrap = bootstrap;
    error.releaseEvidence = cause?.evidence ?? null;
    throw error;
  }

  return {
    bootstrap,
    release,
    accepted: true,
  };
}

function buildConfigurationError(cause, field) {
  const error = new Error(`application runtime acceptance failed at configuration: ${cause.message}`, {
    cause,
  });
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
