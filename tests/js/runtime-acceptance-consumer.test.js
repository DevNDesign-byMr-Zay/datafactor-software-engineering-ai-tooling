import {
  buildRuntimeAcceptanceReceipt,
  fingerprintRuntimeAcceptanceReceipt,
} from '../../src/runtime/runtime-acceptance-receipt.js';

function decideDurableAcceptanceEvidence(
  { receipt, receiptFingerprint } = {},
  previousFingerprint,
) {
  if (!receipt || typeof receiptFingerprint !== 'string' || !receiptFingerprint) {
    return { status: 'rejected', fingerprint: null };
  }

  let verifiedFingerprint;
  try {
    verifiedFingerprint = fingerprintRuntimeAcceptanceReceipt(receipt);
  } catch {
    return { status: 'rejected', fingerprint: null };
  }

  if (verifiedFingerprint !== receiptFingerprint) {
    return { status: 'rejected', fingerprint: null };
  }

  return {
    status: previousFingerprint === verifiedFingerprint ? 'unchanged' : 'changed',
    fingerprint: verifiedFingerprint,
  };
}

function buildAcceptedEvidence({ revision = 'roary-api-00042-abc', traffic } = {}) {
  const acceptance = {
    accepted: true,
    bootstrap: {
      stage: 'readiness',
      readiness: [{ name: 'backend:run', status: 'ready' }],
    },
    release: {
      stage: 'revision-inspect',
      exitCode: 0,
      command: 'gcloud',
      stdout: 'operational output must remain outside the consumer contract',
      service: {
        serviceName: 'roary-api',
        latestReadyRevisionName: revision,
        traffic: traffic ?? [{ revisionName: revision, percent: 100 }],
      },
    },
  };

  const receipt = buildRuntimeAcceptanceReceipt({
    acceptance,
    serviceName: 'roary-api',
    region: 'us-central1',
  });

  return {
    receipt,
    receiptFingerprint: fingerprintRuntimeAcceptanceReceipt(receipt),
  };
}

describe('runtime acceptance consumer boundary', () => {
  test('treats equivalent accepted evidence as unchanged using only the durable fingerprint', () => {
    const first = buildAcceptedEvidence({
      traffic: [
        { revisionName: 'roary-api-00042-abc', percent: 95 },
        { revisionName: 'roary-api-00041-old', percent: 5 },
      ],
    });
    const equivalent = buildAcceptedEvidence({
      traffic: [
        { revisionName: 'roary-api-00041-old', percent: 5 },
        { revisionName: 'roary-api-00042-abc', percent: 95 },
      ],
    });

    expect(equivalent.receiptFingerprint).toBe(first.receiptFingerprint);
    expect(decideDurableAcceptanceEvidence(equivalent, first.receiptFingerprint)).toEqual({
      status: 'unchanged',
      fingerprint: first.receiptFingerprint,
    });
  });

  test('treats the first verified accepted receipt as changed without requiring persistence state', () => {
    const current = buildAcceptedEvidence();

    expect(decideDurableAcceptanceEvidence(current)).toEqual({
      status: 'changed',
      fingerprint: current.receiptFingerprint,
    });
  });

  test('treats a verified new accepted receipt as changed', () => {
    const previous = buildAcceptedEvidence();
    const current = buildAcceptedEvidence({ revision: 'roary-api-00043-def' });

    expect(current.receiptFingerprint).not.toBe(previous.receiptFingerprint);
    expect(decideDurableAcceptanceEvidence(current, previous.receiptFingerprint)).toEqual({
      status: 'changed',
      fingerprint: current.receiptFingerprint,
    });
  });

  test('rejects a failed acceptance without reading operational release evidence', () => {
    let releaseRead = false;
    const rejectedAcceptance = {
      accepted: false,
      get release() {
        releaseRead = true;
        throw new Error('consumer must not inspect release logs');
      },
    };

    expect(decideDurableAcceptanceEvidence(rejectedAcceptance, 'previous')).toEqual({
      status: 'rejected',
      fingerprint: null,
    });
    expect(releaseRead).toBe(false);
  });

  test('rejects tampered durable evidence when the supplied fingerprint no longer matches', () => {
    const accepted = buildAcceptedEvidence();
    const tampered = {
      ...accepted,
      receipt: {
        ...accepted.receipt,
        service: {
          ...accepted.receipt.service,
          latestReadyRevisionName: 'roary-api-tampered',
        },
      },
    };

    expect(decideDurableAcceptanceEvidence(tampered, accepted.receiptFingerprint)).toEqual({
      status: 'rejected',
      fingerprint: null,
    });
  });
});
