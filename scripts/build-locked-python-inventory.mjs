import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PIN = /^([a-zA-Z0-9][a-zA-Z0-9._-]*)==([a-zA-Z0-9][a-zA-Z0-9._+!-]*)$/u;
const SHA256 = /^--hash=sha256:([a-f0-9]{64})$/u;
const normalize = (name) => name.toLowerCase().replace(/[-_.]+/gu, '-');
const digest = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

export function buildLockedPythonInventory(lockedText, hashedText) {
  if (typeof lockedText !== 'string' || typeof hashedText !== 'string') {
    throw new TypeError('Both exact Python dependency files are required');
  }
  const versions = new Map();
  for (const source of lockedText.split(/\r?\n/u)) {
    const line = source.trim();
    if (!line || line.startsWith('#')) continue;
    const match = PIN.exec(line);
    if (!match) throw new TypeError('Invalid exact Python distribution pin');
    const name = normalize(match[1]);
    if (versions.has(name)) throw new TypeError('Duplicate exact Python distribution pin');
    versions.set(name, match[2]);
  }
  if (versions.size === 0) throw new TypeError('Empty exact Python lock');

  const hashed = new Map();
  let tokens = [];
  for (const source of hashedText.split(/\r?\n/u)) {
    let line = source.trim();
    if (!line || line.startsWith('#')) continue;
    const continued = line.endsWith('\\');
    if (continued) line = line.slice(0, -1).trim();
    tokens.push(...line.split(/\s+/u));
    if (continued) continue;
    const match = PIN.exec(tokens[0]);
    if (!match) throw new TypeError('Invalid hashed Python distribution pin');
    const name = normalize(match[1]);
    if (hashed.has(name)) throw new TypeError('Duplicate hashed Python distribution pin');
    if (versions.get(name) !== match[2]) {
      throw new TypeError('Hashed Python lock does not match exact dependency versions');
    }
    const digests = [];
    for (const token of tokens.slice(1)) {
      const hash = SHA256.exec(token);
      if (!hash) throw new TypeError('Invalid Python artifact SHA-256');
      digests.push(hash[1]);
    }
    if (!digests.length || new Set(digests).size !== digests.length) {
      throw new TypeError('Missing or duplicated Python artifact hashes');
    }
    hashed.set(name, digests.sort());
    tokens = [];
  }
  if (tokens.length > 0 || hashed.size !== versions.size) {
    throw new TypeError('Incomplete hashed Python dependency inventory');
  }
  return {
    schemaVersion: 1,
    inventoryType: 'locked-python-distributions',
    source: {
      exactLock: 'requirements.lock.txt',
      exactLockSha256: digest(lockedText),
      artifactLock: 'requirements.hashed.txt',
      artifactLockSha256: digest(hashedText),
    },
    packageCount: versions.size,
    packages: [...versions.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, version]) => ({ name, version, sha256Hashes: hashed.get(name) })),
  };
}

async function cli() {
  if (process.argv.length !== 4 || process.argv[2] !== '--output' || !process.argv[3]) {
    throw new TypeError('usage: build-locked-python-inventory.mjs --output FILE');
  }
  const root = new URL('../', import.meta.url);
  const [lockedText, hashedText] = await Promise.all([
    readFile(new URL('requirements.lock.txt', root), 'utf8'),
    readFile(new URL('requirements.hashed.txt', root), 'utf8'),
  ]);
  const inventory = buildLockedPythonInventory(lockedText, hashedText);
  await writeFile(process.argv[3], JSON.stringify(inventory, null, 2) + '\n', 'utf8');
  process.stdout.write('Verified ' + inventory.packageCount + ' hash-locked Python distributions\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await cli();
  } catch (error) {
    process.stderr.write('Python release inventory failed: ' + error.message + '\n');
    process.exitCode = 1;
  }
}
