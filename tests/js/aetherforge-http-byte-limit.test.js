import { createWorkbenchServer as commercial } from '../../apps/aetherforge-commercial/server.mjs';
import { createWorkbenchServer as companion } from '../../apps/aetherforge-workbench/server.mjs';

describe.each([
  ['commercial', commercial],
  ['companion', companion],
])('%s workflow request boundary', (_, factory) => {
  test('rejects UTF-8 bodies over 64 KiB even when their character count is smaller', async () => {
    const server = factory();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const payload = JSON.stringify({
        action: 'unsupported',
        inputs: { value: '界'.repeat(24000) },
      });
      expect(payload.length).toBeLessThan(64 * 1024);
      expect(new TextEncoder().encode(payload).length).toBeGreaterThan(64 * 1024);
      const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload,
      });
      expect(response.status).toBe(413);
      expect(await response.json()).toEqual({ error: 'Request exceeds limit' });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
