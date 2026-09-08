import { readFile } from 'node:fs/promises';

const envExample = await readFile(new URL('../../.env.example', import.meta.url), 'utf8');
const documentedKeys = new Set(
  envExample
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => line.slice(0, line.indexOf('='))),
);

const requiredMaintainedKeys = [
  'ALLOWED_ORIGINS',
  'APP_API_TOKEN',
  'ASTER_API_TOKEN',
  'BUCKET_NAME',
  'GEMINI_API_KEY',
  'GOOGLE_CLOUD_PROJECT',
  'GOOGLE_CLOUD_REGION',
  'PORT',
];

describe('maintained environment example', () => {
  test.each(requiredMaintainedKeys)('documents %s without requiring a real secret', (key) => {
    expect(documentedKeys.has(key)).toBe(true);
  });
});
