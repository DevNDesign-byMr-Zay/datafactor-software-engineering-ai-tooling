import { describe, expect, test } from '@jest/globals';
import {
  fingerprintRuntimeAcceptanceReceipt,
  serializeRuntimeAcceptanceReceipt,
} from '../../src/runtime/runtime-acceptance-receipt.js';
import { runtimeAcceptanceConsumerFixture } from './fixtures/runtime-acceptance-consumer.js';

describe('runtime acceptance consumer fixture', () => {
  test('contains only the durable receipt contract a downstream consumer needs', () => {
    const serialized = serializeRuntimeAcceptanceReceipt(runtimeAcceptanceConsumerFixture);

    expect(serialized).toContain('roary-api-00042-abc');
    expect(serialized).toContain('revision-inspect');
    for (const diagnosticField of [
      'stdout',
      'stderr',
      'command',
      'args',
      'token',
      'environment',
      'release',
    ]) {
      expect(serialized).not.toContain(`"${diagnosticField}"`);
    }
  });

  test('fingerprints equivalent traffic ordering identically', () => {
    const equivalent = {
      ...runtimeAcceptanceConsumerFixture,
      service: {
        ...runtimeAcceptanceConsumerFixture.service,
        traffic: [...runtimeAcceptanceConsumerFixture.service.traffic].reverse(),
      },
    };

    expect(fingerprintRuntimeAcceptanceReceipt(equivalent)).toBe(
      fingerprintRuntimeAcceptanceReceipt(runtimeAcceptanceConsumerFixture),
    );
  });

  test('changes the fingerprint when a trusted rollout fact changes', () => {
    const changed = {
      ...runtimeAcceptanceConsumerFixture,
      service: {
        ...runtimeAcceptanceConsumerFixture.service,
        traffic: runtimeAcceptanceConsumerFixture.service.traffic.map((entry) =>
          entry.tag === 'canary' ? { ...entry, percent: 20 } : { ...entry, percent: 80 },
        ),
      },
    };

    expect(fingerprintRuntimeAcceptanceReceipt(changed)).not.toBe(
      fingerprintRuntimeAcceptanceReceipt(runtimeAcceptanceConsumerFixture),
    );
  });
});
