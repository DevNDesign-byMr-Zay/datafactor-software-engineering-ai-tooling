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

/**
 * Produce one deterministic summary suitable for logs, agent context, or UI.
 * No provider diagnostics or operational recommendation is introduced here.
 */
export function summarizeRuntimeAcceptanceExplanation(changes) {
  const explanations = explainRuntimeAcceptanceDiff(changes);
  if (explanations.length === 0) {
    return 'No trusted acceptance changes detected.';
  }

  return explanations.map(({ message }) => message).join('; ');
}
