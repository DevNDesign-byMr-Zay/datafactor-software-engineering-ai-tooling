import { readFile } from 'node:fs/promises';

import { describe, expect, test } from '@jest/globals';

const REQUIRED_ENV_KEYS = Object.freeze([
  'ALLOWED_ORIGINS',
  'APP_API_TOKEN',
  'ASTER_API_TOKEN',
  'BUCKET_NAME',
  'GEMINI_API_KEY',
  'GOOGLE_CLOUD_PROJECT',
  'GOOGLE_CLOUD_REGION',
  'PORT',
  'ASTER_PROMPT_MAX_CHARS',
  'ASTER_FILL_GUIDANCE',
  'ASTER_EXPAND_PREFILL_BLUR',
  'ASTER_EXPAND_MASK_FEATHER',
  'GITHUB_SHA',
  'RELEASE_TAG',
]);

function declaredKeys(source) {
  return new Set(
    source
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => line.slice(0, line.indexOf('='))),
  );
}

describe('fresh-clone environment contract', () => {
  test('documents every maintained and CI-only environment name', async () => {
    const source = await readFile(new URL('../../.env.example', import.meta.url), 'utf8');
    const keys = declaredKeys(source);

    for (const key of REQUIRED_ENV_KEYS) {
      expect(keys.has(key)).toBe(true);
    }
  });
});
