import { describe, expect, test } from '@jest/globals';

import { rejectWorkbenchRequestBoundary } from '../../src/api/workbench-request-boundary.js';
import { createWorkbenchServer as createCompanion } from '../../apps/aetherforge-workbench/server.mjs';
import { createWorkbenchServer as createCommercial } from '../../apps/aetherforge-commercial/server.mjs';

const localOptions = {
  port: 4545,
  codespacesEnabled: false,
  codespaceName: 'private-workbench',
};

function check(headers, options = localOptions) {
  return rejectWorkbenchRequestBoundary({ headers }, options);
}

describe('shared ÆtherForge host and origin boundary', () => {
  test.each(['127.0.0.1', '127.0.0.1:4545', 'localhost', 'localhost:4545'])(
    'accepts the existing loopback host %s',
    (host) => {
      expect(check({ host })).toBeNull();
    },
  );

  test.each([
    '',
    '0.0.0.0',
    '0.0.0.0:4545',
    '192.168.1.15:4545',
    'localhost.example:4545',
    '127.0.0.1.evil.test:4545',
    'LOCALHOST:4545',
    '[::1]:4545',
  ])('rejects an unapproved host %s', (host) => {
    expect(check({ host })).toBe('Local or private Codespaces host required');
  });

  test('requires exact origin and refuses cross-site fetch metadata independently', () => {
    expect(check({ host: 'localhost:4545', origin: 'http://localhost:4545' })).toBeNull();
    expect(check({ host: 'localhost:4545', origin: 'http://127.0.0.1:4545' })).toBe(
      'Cross-origin requests are not accepted',
    );
    expect(check({ host: 'localhost:4545', origin: 'https://localhost:4545' })).toBe(
      'Cross-origin requests are not accepted',
    );
    expect(check({ host: 'localhost:4545', 'sec-fetch-site': 'same-site' })).toBeNull();
    expect(check({ host: 'localhost:4545', 'sec-fetch-site': 'cross-site' })).toBe(
      'Cross-site requests are not accepted',
    );
    expect(
      check({
        host: 'localhost:4545',
        origin: 'http://localhost:4545',
        'sec-fetch-site': 'cross-site',
      }),
    ).toBe('Cross-site requests are not accepted');
  });

  test('permits only the exact private Codespaces forward and preserved forwarded origin', () => {
    const options = { ...localOptions, codespacesEnabled: true };
    const forwardHost = 'private-workbench-4545.app.github.dev';

    expect(check({ host: forwardHost, origin: 'https://' + forwardHost }, options)).toBeNull();
    expect(check({ host: forwardHost, origin: 'http://' + forwardHost }, options)).toBe(
      'Cross-origin requests are not accepted',
    );
    expect(check({ host: forwardHost }, localOptions)).toBe(
      'Local or private Codespaces host required',
    );
    expect(check({ host: 'private-workbench-4546.app.github.dev' }, options)).toBe(
      'Local or private Codespaces host required',
    );
    expect(check({ host: 'localhost:4545', origin: 'https://' + forwardHost }, options)).toBeNull();
    expect(check({ host: 'localhost:4545', origin: 'https://' + forwardHost }, localOptions)).toBe(
      'Cross-origin requests are not accepted',
    );
  });

  test('does not trust an invalid Codespaces name or a plausible external subdomain', () => {
    const invalid = {
      port: 4545,
      codespacesEnabled: true,
      codespaceName: 'PRIVATE_workbench',
    };
    expect(check({ host: 'PRIVATE_workbench-4545.app.github.dev' }, invalid)).toBe(
      'Local or private Codespaces host required',
    );
    expect(
      check(
        { host: 'private-workbench-4545.app.github.dev.evil.test' },
        { ...localOptions, codespacesEnabled: true },
      ),
    ).toBe('Local or private Codespaces host required');
  });

  test.each([
    ['companion', createCompanion],
    ['commercial', createCommercial],
  ])('%s maintains 403 contracts through its real HTTP listener', async (_name, createServer) => {
    const server = createServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;

    try {
      const accepted = await fetch(base + '/api/health');
      expect(accepted.status).toBe(200);

      for (const [headers, error] of [
        [{ origin: 'https://evil.example' }, 'Cross-origin requests are not accepted'],
        [{ 'sec-fetch-site': 'cross-site' }, 'Cross-site requests are not accepted'],
      ]) {
        const response = await fetch(base + '/api/health', { headers });
        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({ error });
        expect(response.headers.get('x-frame-options')).toBe('DENY');
        expect(response.headers.get('cache-control')).toBe('no-store');
      }
    } finally {
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
