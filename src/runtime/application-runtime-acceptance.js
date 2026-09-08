import {
  executeApplicationBootstrapWithReadiness,
} from '../bootstrap/application-bootstrap-readiness.js';
import {
  inspectCloudRunRelease,
} from '../deployment/cloud-run-release-evidence.js';

/**
 * Execute the maintained application bootstrap/readiness path, then capture
 * mechanically returned Cloud Run revision/traffic evidence for the deployed
 * service. This does not deploy or move traffic; it only joins already
 * maintained runtime acceptance boundaries into one evidence record.
 */
export async function executeApplicationRuntimeAcceptance(plan, options = {}) {
  const serviceName = requireNonEmptyString(options.serviceName, 'serviceName');
  const region = options.region;
  const execFile = options.execFile;

  const bootstrap = await executeApplicationBootstrapWithReadiness(
    plan,
    options,
  );

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

function requireNonEmptyString(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}
