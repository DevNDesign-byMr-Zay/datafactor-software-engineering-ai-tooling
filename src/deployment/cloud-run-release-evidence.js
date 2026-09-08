const DEFAULT_REGION = 'us-central1';

function requireNonEmptyString(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function requirePercent(value) {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new TypeError('percent must be an integer between 0 and 100');
  }
  return value;
}

function normalizeProcessResult(result = {}) {
  return {
    exitCode: Number(result.exitCode ?? result.code ?? 0),
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? ''),
  };
}

function buildProcessEvidence(stage, args, result) {
  return {
    stage,
    command: 'gcloud',
    args: [...args],
    ...normalizeProcessResult(result),
  };
}

function parseJsonOutput(stdout, stage) {
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`${stage} returned invalid JSON`, { cause: error });
  }
}

function normalizeTraffic(traffic) {
  if (!Array.isArray(traffic)) return [];

  return traffic
    .map((entry) => ({
      revisionName:
        typeof entry?.revisionName === 'string' && entry.revisionName.trim()
          ? entry.revisionName.trim()
          : null,
      percent: Number.isFinite(Number(entry?.percent))
        ? Number(entry.percent)
        : null,
      tag:
        typeof entry?.tag === 'string' && entry.tag.trim()
          ? entry.tag.trim()
          : null,
      url:
        typeof entry?.url === 'string' && entry.url.trim()
          ? entry.url.trim()
          : null,
    }))
    .filter((entry) => entry.revisionName);
}

export function buildCloudRunServiceDescribeArgs({
  serviceName,
  region = DEFAULT_REGION,
} = {}) {
  return [
    'run',
    'services',
    'describe',
    requireNonEmptyString(serviceName, 'serviceName'),
    '--region',
    requireNonEmptyString(region, 'region'),
    '--format=json',
  ];
}

export function buildCloudRunTrafficShiftArgs({
  serviceName,
  revisionName,
  region = DEFAULT_REGION,
  percent = 100,
} = {}) {
  const normalizedPercent = requirePercent(percent);

  return [
    'run',
    'services',
    'update-traffic',
    requireNonEmptyString(serviceName, 'serviceName'),
    '--region',
    requireNonEmptyString(region, 'region'),
    '--to-revisions',
    `${requireNonEmptyString(revisionName, 'revisionName')}=${normalizedPercent}`,
    '--format=json',
  ];
}

export function parseCloudRunServiceEvidence(value) {
  const service =
    typeof value === 'string' ? parseJsonOutput(value, 'service describe') : value;
  if (!service || typeof service !== 'object' || Array.isArray(service)) {
    throw new TypeError(
      'service evidence must be an object or JSON object string',
    );
  }

  const serviceName = requireNonEmptyString(
    service?.metadata?.name,
    'metadata.name',
  );
  const latestReadyRevisionName = requireNonEmptyString(
    service?.status?.latestReadyRevisionName,
    'status.latestReadyRevisionName',
  );

  return {
    serviceName,
    latestReadyRevisionName,
    url:
      typeof service?.status?.url === 'string' && service.status.url.trim()
        ? service.status.url
        : null,
    traffic: normalizeTraffic(service?.status?.traffic),
  };
}

async function executeGcloudJson(stage, args, { execFile } = {}) {
  if (typeof execFile !== 'function') {
    throw new TypeError('execFile must be a function');
  }

  let rawResult;
  try {
    rawResult = await execFile('gcloud', args);
  } catch (error) {
    const evidence = buildProcessEvidence(stage, args, error);
    const failure = new Error(
      evidence.exitCode !== 0
        ? `${stage} failed with exit code ${evidence.exitCode}`
        : `${stage} failed before a process result was returned`,
      { cause: error },
    );
    failure.evidence = evidence;
    throw failure;
  }

  const evidence = buildProcessEvidence(stage, args, rawResult);

  if (evidence.exitCode !== 0) {
    const failure = new Error(
      `${stage} failed with exit code ${evidence.exitCode}`,
    );
    failure.evidence = evidence;
    throw failure;
  }

  const service = parseCloudRunServiceEvidence(evidence.stdout);
  return { ...evidence, service };
}

export async function inspectCloudRunRelease({
  serviceName,
  region = DEFAULT_REGION,
  execFile,
} = {}) {
  const args = buildCloudRunServiceDescribeArgs({ serviceName, region });
  return executeGcloudJson('revision-inspect', args, { execFile });
}

export async function shiftCloudRunTraffic({
  serviceName,
  revisionName,
  region = DEFAULT_REGION,
  percent = 100,
  execFile,
} = {}) {
  const args = buildCloudRunTrafficShiftArgs({
    serviceName,
    revisionName,
    region,
    percent,
  });
  return executeGcloudJson('traffic-shift', args, { execFile });
}

export async function rollbackCloudRunTraffic({
  serviceName,
  priorRevisionName,
  region = DEFAULT_REGION,
  execFile,
} = {}) {
  const args = buildCloudRunTrafficShiftArgs({
    serviceName,
    revisionName: priorRevisionName,
    region,
    percent: 100,
  });
  return executeGcloudJson('traffic-rollback', args, { execFile });
}
