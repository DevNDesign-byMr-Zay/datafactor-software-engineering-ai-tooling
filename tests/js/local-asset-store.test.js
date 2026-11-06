import { afterEach, describe, expect, test } from '@jest/globals';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import * as companion from '../../apps/aetherforge-workbench/asset-store.mjs';
import * as commercial from '../../apps/aetherforge-commercial/asset-store.mjs';

const directories = [];
const samples = [
  ['image/png', 'png', Buffer.from('89504e470d0a1a0a', 'hex')],
  ['image/jpeg', 'jpg', Buffer.from('ffd8ff', 'hex')],
  [
    'image/webp',
    'webp',
    Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]),
  ],
];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function tempDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'aetherforge-shared-asset-'));
  directories.push(directory);
  return directory;
}

describe('shared local asset store', () => {
  test('the companion and commercial adapter imports use the same maintained implementation', () => {
    expect(companion.saveLocalAsset).toBe(commercial.saveLocalAsset);
    expect(companion.listLocalAssets).toBe(commercial.listLocalAssets);
    expect(companion.getLocalAsset).toBe(commercial.getLocalAsset);
  });

  test.each([
    ['companion', companion],
    ['commercial', commercial],
  ])('%s retains image, metadata, and content-addressed URL contracts', async (_name, store) => {
    const directory = await tempDirectory();
    expect(await store.listLocalAssets(join(directory, 'not-yet-created'))).toEqual([]);

    for (const [mime, extension, bytes] of samples) {
      const asset = await store.saveLocalAsset(
        directory,
        bytes,
        `photo-${extension}`,
        mime,
      );
      const expectedId = `${createHash('sha256').update(bytes).digest('hex')}.${extension}`;
      expect(asset).toEqual({
        id: expectedId,
        name: `photo-${extension}`,
        mimeType: mime,
        size: bytes.length,
        stored: 'local-only',
        url: `/api/assets/${expectedId}`,
      });
      const read = await store.getLocalAsset(directory, expectedId);
      expect(read.mime).toBe(mime);
      expect(read.bytes).toEqual(bytes);
      expect(JSON.parse(await readFile(join(directory, expectedId + '.json'), 'utf8'))).toEqual(
        {
          id: expectedId,
          name: `photo-${extension}`,
          mimeType: mime,
          size: bytes.length,
          stored: 'local-only',
        },
      );
    }

    const listed = await store.listLocalAssets(directory);
    expect(listed).toHaveLength(samples.length);
    expect(listed.map((asset) => asset.name)).toEqual(['photo-jpg', 'photo-png', 'photo-webp']);
    expect(await readdir(directory)).toHaveLength(samples.length * 2);
  });

  test.each([
    ['companion', companion],
    ['commercial', commercial],
  ])('%s keeps invalid uploads and traversal paths blocked', async (_name, store) => {
    const directory = await tempDirectory();
    const png = samples[0][2];
    await expect(store.saveLocalAsset(directory, Buffer.alloc(0), 'empty', 'image/png')).rejects.toThrow(
      'File must be 1 byte to 6 MiB',
    );
    await expect(
      store.saveLocalAsset(directory, Buffer.alloc(6 * 1024 * 1024 + 1), 'large', 'image/png'),
    ).rejects.toThrow('File must be 1 byte to 6 MiB');
    await expect(store.saveLocalAsset(directory, png, 'wrong', 'image/jpeg')).rejects.toThrow(
      'Unsupported or mismatched file format',
    );
    await expect(store.saveLocalAsset(directory, png, 'wrong', 'text/html')).rejects.toThrow(
      'Unsupported or mismatched file format',
    );
    await expect(store.getLocalAsset(directory, '../../package.json')).rejects.toThrow(
      'Invalid asset ID',
    );
  });

  test('duplicate byte uploads retain their content-addressed identity', async () => {
    const directory = await tempDirectory();
    const bytes = samples[0][2];
    const first = await companion.saveLocalAsset(directory, bytes, 'first', 'image/png');
    const second = await commercial.saveLocalAsset(directory, bytes, 'second', 'image/png');
    expect(first.id).toBe(second.id);
    expect(await companion.getLocalAsset(directory, first.id)).toEqual({
      bytes,
      mime: 'image/png',
    });
    const assets = await commercial.listLocalAssets(directory);
    expect(assets).toHaveLength(1);
    expect(assets[0].name).toBe('second');
  });
});
