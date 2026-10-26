import { readFile } from 'node:fs/promises';
import { generateEvidenceCenterArtifacts, syncEvidenceCenter } from '../../scripts/sync-evidence-center.mjs';
import * as workbench from '../../apps/aetherforge-workbench/evidence-center.js';
import * as commercial from '../../apps/aetherforge-commercial/evidence-center.js';

const root = new URL('../../', import.meta.url);

describe('single-source Evidence Center', () => {
  test('commercial ESM re-exports the same reviewed functions as the companion', () => {
    expect(Object.keys(commercial).sort()).toEqual(Object.keys(workbench).sort());
    for (const name of Object.keys(workbench)) {
      expect(commercial[name]).toBe(workbench[name]);
    }
  });

  test('both entrypoints preserve accepted and rejected receipt behavior', () => {
    const fingerprint = 'a'.repeat(64);
    const receipt = { accepted: true };
    const good = {
      status: 'checked',
      authority: 'none',
      result: { status: 'changed', fingerprint, reason: null },
    };
    for (const entrypoint of [workbench, commercial]) {
      const accepted = entrypoint.classifyEvidence(good, receipt, fingerprint);
      expect(accepted.verdict).toBe('CHANGED');
      expect(accepted.trusted).toBe(true);
      expect(accepted.authority).toBe('NONE');
      const untrusted = entrypoint.classifyEvidence(good, { accepted: false }, fingerprint);
      expect(untrusted.verdict).toBe('REJECTED');
      expect(untrusted.trusted).toBe(false);
      expect(untrusted.authority).toBe('NONE');
    }
  });

  test('commercial browser bundle is generated exactly and retains offline fail-closed guard', async () => {
    await expect(syncEvidenceCenter()).resolves.toBeUndefined();
    const canonical = await readFile(
      new URL('apps/aetherforge-workbench/evidence-center.js', root),
      'utf8',
    );
    const browser = generateEvidenceCenterArtifacts(canonical).browser;
    const oldGuard =
      "rejectLocally('Maintained fingerprint verification requires the localhost adapter.";
    expect(canonical).not.toContain(oldGuard);
    expect(browser).toContain(oldGuard);
    expect(browser).not.toMatch(/^export (async )?function /gmu);
    expect(browser).toContain('AUTHORITY: ');
  });

  test('generator fails closed if public function exports or receipt request changes', async () => {
    const canonical = await readFile(
      new URL('apps/aetherforge-workbench/evidence-center.js', root),
      'utf8',
    );
    expect(() => generateEvidenceCenterArtifacts(canonical.replace('export function classifyEvidence', 'function classifyEvidence'))).toThrow(
      /public function exports/u,
    );
    expect(() => generateEvidenceCenterArtifacts(canonical.replace("const body=JSON.stringify({action:'receipt'", "const body=JSON.stringify({action:'other'"))).toThrow(
      /maintained receipt request/u,
    );
  });
});
