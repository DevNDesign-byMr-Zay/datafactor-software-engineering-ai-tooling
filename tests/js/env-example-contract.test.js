import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const envExamplePath = path.join(repositoryRoot, '.env.example');

function readEnvExample() {
  const entries = new Map();
  for (const rawLine of fs.readFileSync(envExamplePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    entries.set(line.slice(0, separator), line.slice(separator + 1));
  }
  return entries;
}

describe('.env.example maintained configuration contract', () => {
  test('documents every maintained deployment and API setting', () => {
    const entries = readEnvExample();
    const required = [
      'ALLOWED_ORIGINS',
      'APP_API_TOKEN',
      'ASTER_API_TOKEN',
      'BUCKET_NAME',
      'GEMINI_API_KEY',
      'GOOGLE_CLOUD_PROJECT',
      'GOOGLE_CLOUD_REGION',
      'PORT',
    ];

    expect([...entries.keys()]).toEqual(expect.arrayContaining(required));
    for (const key of required) {
      expect(entries.get(key)?.trim()).toBeTruthy();
    }
  });

  test('uses explicit non-secret placeholders for credential values', () => {
    const entries = readEnvExample();
    for (const key of ['APP_API_TOKEN', 'ASTER_API_TOKEN', 'GEMINI_API_KEY']) {
      expect(entries.get(key)).toMatch(/^<[^>]+>$/);
    }
  });
});
