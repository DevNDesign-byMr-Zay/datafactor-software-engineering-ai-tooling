import { describe, expect, test } from '@jest/globals';

import {
  WORKBENCH_MODULES,
  runWorkbenchAction,
  summarizeWorkbench,
} from '../../src/api/workbench-contract.js';
import { workflowRequestSchema } from '../../src/api/workflow-request-schema.js';
import { createWorkbenchServer as createCompanion } from '../../apps/aetherforge-workbench/server.mjs';
import { createWorkbenchServer as createCommercial } from '../../apps/aetherforge-commercial/server.mjs';

const actions = [
  { action: 'cloud', inputs: { serviceName: 'example', region: 'us-central1' } },
  { action: 'brush', inputs: { brushSize: '48', shape: 'circle', feather: '10', distance: '90' } },
  {
    action: 'holo',
    inputs: { snapshotId: 'design-01', provenanceRef: 'example-01', intent: 'Inspect shape' },
  },
  {
    action: 'energy',
    inputs: { durationMs: 100, estimatedEnergyWh: '14.5', renewableRatio: '0.5' },
  },
  { action: 'receipt', inputs: { receipt: {}, receiptFingerprint: 'a'.repeat(64) } },
];

describe('canonical ÆtherForge workbench contract', () => {
  test('preserves the ten maintained modules and stable summary capabilities', () => {
    const summary = summarizeWorkbench();
    expect(WORKBENCH_MODULES).toHaveLength(10);
    expect(summary).toEqual({
      source: 'maintained-library',
      moduleCount: 10,
      categories: [
        { category: 'Security', count: 2 },
        { category: 'Deployment', count: 1 },
        { category: 'Evidence', count: 1 },
        { category: 'Spatial', count: 1 },
        { category: 'Sustainability', count: 1 },
        { category: 'Frontend', count: 1 },
        { category: 'Runtime', count: 1 },
        { category: 'Storage', count: 1 },
        { category: 'Reliability', count: 1 },
      ],
      quickActions: [
        {
          id: 'studio',
          label: 'Open Workflow Studio',
          description: 'Run bounded library calculations',
          page: 'studio',
        },
        {
          id: 'modules',
          label: 'Browse Module Library',
          description: 'Inspect maintained capabilities',
          page: 'modules',
        },
        {
          id: 'evidence',
          label: 'Verify Evidence',
          description: 'Fail-closed receipt inspection',
          page: 'evidence',
        },
        {
          id: 'assets',
          label: 'Open Asset Studio',
          description: 'Review shipped ÆtherForge assets',
          page: 'assets',
        },
      ],
      boundary: {
        cloudMutations: false,
        aiProvider: false,
        localAdapterOnly: true,
        externalNetworkCalls: false,
      },
    });
  });

  test.each(actions)('executes maintained $action with existing result envelope', (payload) => {
    const parsed = workflowRequestSchema.parse(payload);
    const outcome = runWorkbenchAction(parsed);
    expect(outcome).toHaveProperty('status');
    expect(outcome).toHaveProperty('result');
    if (payload.action === 'cloud' || payload.action === 'holo') {
      expect(outcome).toMatchObject({ status: 'planned', advisoryOnly: true, executed: false });
    }
    if (payload.action === 'receipt') {
      expect(outcome).toMatchObject({ status: 'checked', authority: 'none' });
    }
  });

  test('retains unknown-workflow rejection and rejects malformed dispatcher inputs', () => {
    expect(() => runWorkbenchAction(null)).toThrow('Invalid workflow body');
    expect(() => runWorkbenchAction({ action: 'unknown', inputs: {} })).toThrow(
      'Unsupported workflow',
    );
    expect(() => runWorkbenchAction({ action: 'cloud', inputs: null })).toThrow('Invalid inputs');
  });

  test.each([
    ['companion', createCompanion],
    ['commercial', createCommercial],
  ])(
    '%s exposes the same module catalog and action result contracts',
    async (_name, createServer) => {
      const server = createServer();
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const url = `http://127.0.0.1:${server.address().port}`;
      try {
        const modules = await fetch(`${url}/api/modules`);
        expect(modules.status).toBe(200);
        expect(await modules.json()).toEqual({
          source: 'canonical maintained exports',
          modules: WORKBENCH_MODULES,
        });
        const summary = await fetch(`${url}/api/workbench/summary`);
        expect(summary.status).toBe(200);
        expect(await summary.json()).toEqual(summarizeWorkbench());

        for (const payload of actions) {
          const response = await fetch(`${url}/api/run`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          });
          expect(response.status).toBe(200);
          expect(await response.json()).toEqual(
            runWorkbenchAction(workflowRequestSchema.parse(payload)),
          );
        }

        const invalid = await fetch(`${url}/api/run`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'cloud', inputs: { serviceName: 42 } }),
        });
        expect(invalid.status).toBe(422);
        expect(await invalid.json()).toEqual({
          error: 'Invalid workflow input. Review the required fields.',
        });
      } finally {
        await new Promise((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    },
  );
});
