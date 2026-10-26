import { buildCiGateReceipt, REQUIRED_GATES } from '../../scripts/build-ci-gate-receipt.mjs';

const sha = '67902604cb889e076bf24ecb907f641009749eda';

function passingNeeds() {
  return Object.fromEntries(
    REQUIRED_GATES.map((name) => [name, { result: 'success', outputs: {} }]),
  );
}

describe('CI gate outcomes receipt', () => {
  test('projects all four verified GitHub prerequisite job outcomes onto the exact commit', () => {
    const receipt = buildCiGateReceipt({ needs: passingNeeds(), sha, runId: '40041514498' });
    expect(receipt).toEqual({
      schemaVersion: 1,
      evidenceType: 'github-actions-prerequisite-outcomes',
      workflow: 'engineering/ci',
      commit: sha,
      runId: 40041514498,
      source: 'github-actions-needs-context',
      outcomes: {
        javascript: 'success',
        python: 'success',
        'fresh-clone-smoke': 'success',
        container: 'success',
      },
      authority: 'Consult GitHub Actions for authoritative run and job conclusions',
    });
  });

  test.each(['failure', 'cancelled', 'skipped', 'in_progress', null])(
    'rejects a non-success prerequisite result: %s',
    (result) => {
      const needs = passingNeeds();
      needs.javascript.result = result;
      expect(() => buildCiGateReceipt({ needs, sha, runId: 1 })).toThrow(/did not pass/u);
    },
  );

  test('rejects missing, extra, and prototype-named prerequisite jobs', () => {
    const missing = passingNeeds();
    delete missing.python;
    expect(() => buildCiGateReceipt({ needs: missing, sha, runId: 1 })).toThrow(/approved gate/u);
    const extra = passingNeeds();
    extra.evidence = { result: 'success' };
    expect(() => buildCiGateReceipt({ needs: extra, sha, runId: 1 })).toThrow(/approved gate/u);
    const hostile = { ...passingNeeds(), ['__proto__']: { result: 'success' } };
    expect(() => buildCiGateReceipt({ needs: hostile, sha, runId: 1 })).toThrow(/approved gate/u);
  });

  test('refuses invalid SHA, run IDs and forged job result objects', () => {
    expect(() => buildCiGateReceipt({ needs: passingNeeds(), sha: 'main', runId: 1 })).toThrow(
      /commit SHA/u,
    );
    for (const runId of [0, -1, '1.5', '999999999999999999999']) {
      expect(() => buildCiGateReceipt({ needs: passingNeeds(), sha, runId })).toThrow(/run ID/u);
    }
    const needs = passingNeeds();
    needs.python = Object.create({ result: 'success' });
    expect(() => buildCiGateReceipt({ needs, sha, runId: 1 })).toThrow(/missing job result/u);
  });

  test('discards untrusted outputs and never publishes provider or job metadata', () => {
    const needs = passingNeeds();
    needs.python.outputs = { key: 'DO_NOT_COPY', execution: { private: 'secret' } };
    needs.javascript.other = { env: 'DO_NOT_COPY_EITHER' };
    const receipt = buildCiGateReceipt({ needs, sha, runId: '3' });
    expect(JSON.stringify(receipt)).not.toMatch(/DO_NOT_COPY|private|secret/u);
    expect(Object.keys(receipt.outcomes)).toHaveLength(REQUIRED_GATES.length);
  });
});
