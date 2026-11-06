/**
 * Local-only, content-addressed asset store shared by both ÆtherForge adapters.
 *
 * Keep the existing image signatures, size bounds, metadata contract and
 * localhost asset URL stable for companion and commercial deployments.
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const MIME = new Map([
  [
    'image/png',
    {
      ext: 'png',
      matches: (bytes) =>
        bytes.length >= 8 &&
        bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')),
    },
  ],
  [
    'image/jpeg',
    {
      ext: 'jpg',
      matches: (bytes) =>
        bytes.length >= 3 && bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex')),
    },
  ],
  [
    'image/webp',
    {
      ext: 'webp',
      matches: (bytes) =>
        bytes.length >= 12 &&
        bytes.subarray(0, 4).toString() === 'RIFF' &&
        bytes.subarray(8, 12).toString() === 'WEBP',
    },
  ],
]);
const ID = /^[a-f0-9]{64}\.(?:png|jpg|webp)$/;

function safeName(value) {
  const name = String(value || 'asset')
    .replace(/[/\\\u0000-\u001f\u007f]/g, '_')
    .trim();
  return name.slice(0, 120) || 'asset';
}

export async function saveLocalAsset(dir, bytes, name, mime) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > 6 * 1024 * 1024) {
    throw new TypeError('File must be 1 byte to 6 MiB');
  }
  const spec = MIME.get(mime);
  if (!spec || !spec.matches(bytes)) {
    throw new TypeError('Unsupported or mismatched file format');
  }

  const id = createHash('sha256').update(bytes).digest('hex') + '.' + spec.ext;
  const meta = {
    id,
    name: safeName(name),
    mimeType: mime,
    size: bytes.length,
    stored: 'local-only',
  };
  await mkdir(dir, { recursive: true, mode: 0o700 });
  try {
    await writeFile(join(dir, id), bytes, { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  await writeFile(join(dir, id + '.json'), JSON.stringify(meta), { mode: 0o600 });
  return { ...meta, url: '/api/assets/' + id };
}

export async function listLocalAssets(dir) {
  let names = [];
  try {
    names = await readdir(dir);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const valid = names.filter((name) => ID.test(name)).slice(0, 200);
  const found = await Promise.all(
    valid.map(async (name) => {
      try {
        const content = await readFile(join(dir, name + '.json'), 'utf8');
        const meta = JSON.parse(content);
        return meta.id === name ? { ...meta, url: '/api/assets/' + name } : null;
      } catch {
        return null;
      }
    }),
  );
  return found.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getLocalAsset(dir, id) {
  if (!ID.test(id)) throw new TypeError('Invalid asset ID');
  const spec = [...MIME].find(([, value]) => id.endsWith('.' + value.ext));
  if (!spec) throw new TypeError('Unsupported asset ID');
  return { bytes: await readFile(join(dir, id)), mime: spec[0] };
}
