import { readFile, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const required = Object.freeze([
  'AETHERFORGE_DATA_DIR',
  'AETHERFORGE_SCREENSHOT_DIR',
  'AETHERFORGE_URL',
  'CHROME_PATH',
  'CODESPACES',
  'PLAYWRIGHT_MODULE_PATH',
]);

function exampleEntries(source) {
  const keys = new Map();
  for (const original of source.split(/\r?\n/u)) {
    const line = original.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/u.exec(line);
    if (!match) throw new Error('Malformed .env.example entry: ' + line);
    if (keys.has(match[1])) throw new Error('Duplicate .env.example entry: ' + match[1]);
    keys.set(match[1], match[2]);
  }
  return keys;
}

async function sourcesIn(dir) {
  const files = [];
  for (const item of await readdir(join(root, dir), { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) files.push(...(await sourcesIn(path)));
    else if (item.isFile() && /\.(?:m?js)$/u.test(item.name) && !/\.test\.(?:m?js)$/u.test(item.name)) {
      files.push(path);
    }
  }
  return files;
}

function referencedNames(content) {
  return [...content.matchAll(/process\.env(?:\.([A-Z][A-Z0-9_]*)|\[['"]([A-Z][A-Z0-9_]*)['"]\])/gu)]
    .map((match) => match[1] || match[2]);
}

describe('environment example completeness', () => {
  test('declares all maintained source and optional ÆTHERFORGE QA environment keys', async () => {
    const source = await readFile(join(root, '.env.example'), 'utf8');
    const entries = exampleEntries(source);
    const paths = [
      ...(await sourcesIn('src')),
      ...(await sourcesIn('scripts')),
      ...(await sourcesIn('.devcontainer')),
      ...(await sourcesIn('apps/aetherforge-commercial')),
      ...(await sourcesIn('apps/aetherforge-workbench')),
      'tests/aetherforge-browser-acceptance.mjs',
    ];
    const missing = [];
    for (const path of paths) {
      const content = await readFile(join(root, path), 'utf8');
      for (const key of referencedNames(content)) {
        if (!entries.has(key)) missing.push(key + ' in ' + relative(root, join(root, path)));
      }
    }
    for (const name of required) {
      if (!entries.has(name)) missing.push(name + ' required by cloud/browser setup');
    }
    expect(missing).toEqual([]);
    expect(entries.get('AETHERFORGE_CODESPACES_BIND')).toBe('0');
    expect(entries.get('CODESPACES')).toBe('false');
  });

  test('rejects duplicate keys and does not embed real application credentials', async () => {
    const source = await readFile(join(root, '.env.example'), 'utf8');
    const entries = exampleEntries(source);
    expect(() => exampleEntries('PORT=1\nPORT=2')).toThrow(/Duplicate/u);
    for (const name of ['GEMINI_API_KEY', 'APP_API_TOKEN', 'ASTER_API_TOKEN']) {
      expect(entries.get(name)).toMatch(/^<[^>]+>$/u);
    }
  });
});
