import {
  buildRuntimeAcceptanceReceipt,
  decideRuntimeAcceptanceChange,
  fingerprintRuntimeAcceptanceReceipt,
  RUNTIME_ACCEPTANCE_DECISIONS,
  serializeRuntimeAcceptanceReceipt,
} from '../../src/index.js';

function acceptedTraffic(traffic) {
  return {
    accepted: true,
    bootstrap: {
      stage: 'readiness',
      readiness: [
        { name: 'backend:run', status: 'ready' },
        { name: 'health', status: 'ready' },
      ],
    },
    release: {
      stage: 'revision-inspect',
      exitCode: 0,
      stdout: 'provider diagnostics should never enter the receipt',
      stderr: 'token=redacted-at-the-boundary',
      command: 'gcloud',
      service: {
        serviceName: 'roary-api',
        latestReadyRevisionName: 'roary-api-00042-abc',
        url: 'https://roary-api.example.run.app',
        traffic,
      },
    },
  };
}

const trafficA = [
  { revisionName: 'roary-api-00042-abc', percent: 95, tag: null, url: null },
  { revisionName: 'roary-api-00041-old', percent: 5, tag: null, url: null },
];

const trafficB = [...trafficA].reverse();

describe('runtime acceptance consumer contract', () => {
  test('gives equivalent accepted runs the same canonical fingerprint', () => {
    const receiptA = buildRuntimeAcceptanceReceipt({
      acceptance: acceptedTraffic(trafficA),
      serviceName: 'roary-api',
      region: 'us-central1',
    });
    const receiptB = buildRuntimeAcceptanceReceipt({
      acceptance: acceptedTraffic(trafficB),
      serviceName: 'roary-api',
      region: 'us-central1',
    });

    expect(serializeRuntimeAcceptanceReceipt(receiptA)).toBe(
      serializeRuntimeAcceptanceReceipt(receiptB),
    );
    expect(fingerprintRuntimeAcceptanceReceipt(receiptA)).toBe(
      fingerprintRuntimeAcceptanceReceipt(receiptB),
    );
  });

  test('changes the fingerprint when a trusted acceptance fact changes', () => {
    const baseline = buildRuntimeAcceptanceReceipt({
      acceptance: acceptedTraffic(trafficA),
      serviceName: 'roary-api',
      region: 'us-central1',
    });
    const changed = buildRuntimeAcceptanceReceipt({
      acceptance: acceptedTraffic([
        { revisionName: 'roary-api-00042-abc', percent: 94, tag: null, url: null },
        { revisionName: 'roary-api-00041-old', percent: 6, tag: null, url: null },
      ]),
      serviceName: 'roary-api',
      region: 'us-central1',
    });

    expect(fingerprintRuntimeAcceptanceReceipt(changed)).not.toBe(
      fingerprintRuntimeAcceptanceReceipt(baseline),
    );
  });

  test('lets a consumer distinguish the first trusted observation', () => {
    const receipt = buildRuntimeAcceptanceReceipt({
      acceptance: acceptedTraffic(trafficA),
      serviceName: 'roary-api',
      region: 'us-central1',
    });

    expect(decideRuntimeAcceptanceChange(receipt)).toBe(RUNTIME_ACCEPTANCE_DECISIONS.CHANGED);
  });

  test('lets a consumer distinguish unchanged trusted evidence', () => {
    const receipt = buildRuntimeAcceptanceReceipt({
      acceptance: acceptedTraffic(trafficA),
      serviceName: 'roary-api',
      region: 'us-central1',
    });
    const fingerprint = fingerprintRuntimeAcceptanceReceipt(receipt);

    expect(decideRuntimeAcceptanceChange(receipt, fingerprint)).toBe(
      RUNTIME_ACCEPTANCE_DECISIONS.UNCHANGED,
    );
  });

  test('lets a consumer distinguish changed trusted evidence', () => {
    const baseline = buildRuntimeAcceptanceReceipt({
      acceptance: acceptedTraffic(trafficA),
      serviceName: 'roary-api',
      region: 'us-central1',
    });
    const changed = buildRuntimeAcceptanceReceipt({
      acceptance: acceptedTraffic([
        { revisionName: 'roary-api-00042-abc', percent: 90, tag: null, url: null },
        { revisionName: 'roary-api-00041-old', percent: 10, tag: null, url: null },
      ]),
      serviceName: 'roary-api',
      region: 'us-central1',
    });

    expect(
      decideRuntimeAcceptanceChange(
        changed,
        fingerprintRuntimeAcceptanceReceipt(baseline),
      ),
    ).toBe(RUNTIME_ACCEPTANCE_DECISIONS.CHANGED);
  });

  test('keeps rejected acceptance outside the trusted comparison path', () => {
    expect(decideRuntimeAcceptanceChange({ accepted: false }, 'anything')).toBe(
      RUNTIME_ACCEPTANCE_DECISIONS.REJECTED,
    );
  });

  test('keeps provider/process noise out of the durable receipt', () => {
    const receipt = buildRuntimeAcceptanceReceipt({
      acceptance: acceptedTraffic(trafficA),
      serviceName: 'roary-api',
      region: 'us-central1',
    });
    const serialized = serializeRuntimeAcceptanceReceipt(receipt);

    expect(serialized).not.toContain('provider diagnostics');
    expect(serialized).not.toContain('token=');
    expect(serialized).not.toContain('gcloud');
    expect(serialized).not.toContain('stdout');
    expect(serialized).not.toContain('stderr');
    expect(serialized).not.toContain('command');
  });
});