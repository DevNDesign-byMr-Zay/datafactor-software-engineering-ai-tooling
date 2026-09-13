const FIELD_LABELS = Object.freeze({
  'service.name': 'service name',
  'service.region': 'service region',
  'service.latestReadyRevisionName': 'ready revision',
  'service.traffic': 'traffic allocation',
  'service.url': 'service URL',
  'bootstrap.stage': 'bootstrap stage',
  'bootstrap.readiness': 'readiness',
  'releaseEvidence.stage': 'release evidence stage',
  'releaseEvidence.exitCode': 'release evidence exit code',
});

function labelFor(field) {
  return FIELD_LABELS[field] ?? field;
}

/**
 * Convert semantic trusted changes into concise consumer-facing language.
 * This formatter is deliberately descriptive; it never recommends an action.
 */
export function explainRuntimeAcceptanceDiff(changes) {
  if (!Array.isArray(changes)) {
    throw new TypeError('changes must be an array');
  }

  return changes.map(({ field, previous, current }) => ({
    field,
    label: labelFor(field),
    message: `${labelFor(field)} changed`,
    previous,
    current,
  }));
}
