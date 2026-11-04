/** Dependency-free source distribution integrity and deterministic ZIP helpers. */
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { cp, lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { deflateRawSync } from 'node:zlib';

function physicalLocation(path) {
  let existing = resolve(path);
  const missing = [];
  for (;;) {
    try {
      return resolve(realpathSync(existing), ...missing.reverse());
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      missing.push(basename(existing));
      const parent = dirname(existing);
      if (parent === existing) throw error;
      existing = parent;
    }
  }
}

export function assertOutsideRepository(output, root) {
  const canonicalRoot = physicalLocation(root);
  const canonicalOutput = physicalLocation(output);
  const forward = relative(canonicalRoot, canonicalOutput);
  const reverse = relative(canonicalOutput, canonicalRoot);
  const inside = (path) =>
    path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
  if (inside(forward) || inside(reverse)) throw new Error('Output must not overlap repository');
}

// Runtime-owned local data must never become distributable source, even when a
// package is built from a developer checkout that has been used interactively.
export function isDistributionSource(path) {
  return !path
    .split(/[\\/]/u)
    .some(
      (part) =>
        (part.startsWith('.') && part !== '.devcontainer') ||
        /^(?:node_modules|upstream-mirror|logs|artifacts|coverage|__pycache__)$/iu.test(part) ||
        /^(?:credentials|secrets|id_rsa|private\.key)(?:\.|$)/iu.test(part) ||
        /\.(?:log|pyc)$/iu.test(part),
    );
}

export async function copyDistributionSource(source, target, prefix = '') {
  const info = await lstat(source);
  if (info.isSymbolicLink())
    throw new Error(`Symbolic links are not permitted in release: ${prefix}`);
  if (info.isDirectory()) {
    await mkdir(target, { recursive: true });
    for (const name of (await readdir(source)).sort()) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (isDistributionSource(path))
        await copyDistributionSource(join(source, name), join(target, name), path);
    }
  } else if (info.isFile()) {
    await mkdir(dirname(target), { recursive: true });
    await cp(source, target, { errorOnExist: true, force: false });
  } else throw new Error(`Unsupported release filesystem entry: ${prefix}`);
}

export async function distributionFiles(root, prefix = '') {
  const result = [];
  for (const name of (await readdir(join(root, prefix))).sort()) {
    const path = prefix ? `${prefix}/${name}` : name;
    const info = await lstat(join(root, path));
    if (info.isSymbolicLink())
      throw new Error(`Symbolic links are not permitted in release: ${path}`);
    if (info.isDirectory()) result.push(...(await distributionFiles(root, path)));
    else if (info.isFile()) {
      const bytes = await readFile(join(root, path));
      result.push({
        path,
        size: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
    } else throw new Error(`Unsupported release filesystem entry: ${path}`);
  }
  return result;
}

export async function writeDistributionManifest(directory, metadata) {
  const files = (await distributionFiles(directory)).filter(
    (file) => file.path !== 'SOURCE-SHA256.json',
  );
  const manifest = { schemaVersion: 1, ...metadata, fileCount: files.length, files };
  await writeFile(join(directory, 'SOURCE-SHA256.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function verifyDistribution(directory) {
  const manifest = JSON.parse(await readFile(join(directory, 'SOURCE-SHA256.json'), 'utf8'));
  const actual = (await distributionFiles(directory)).filter(
    (file) => file.path !== 'SOURCE-SHA256.json',
  );
  if (
    manifest.schemaVersion !== 1 ||
    manifest.fileCount !== actual.length ||
    JSON.stringify(manifest.files) !== JSON.stringify(actual)
  ) {
    throw new Error(
      'Distribution integrity verification failed: missing, modified or unexpected files',
    );
  }
  return manifest;
}

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
  }
  return (value ^ 0xffffffff) >>> 0;
}

/** ZIP 2.0/UTF-8, fixed 1980-01-01 timestamp, deterministic ordering, no ZIP64. */
export async function writeDistributionArchive(directory, archivePath = `${directory}.zip`) {
  const root = resolve(directory),
    target = resolve(archivePath);
  const within = relative(root, target);
  if (within === '' || (!within.startsWith(`..${sep}`) && within !== '..' && !isAbsolute(within)))
    throw new Error('Archive must be outside distribution directory');
  await verifyDistribution(root);
  const files = await distributionFiles(root);
  if (files.length > 65535) throw new Error('ZIP64 is not supported');
  const local = [],
    central = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.path, 'utf8');
    const bytes = await readFile(join(root, file.path));
    const compressed = deflateRawSync(bytes, { level: 9 });
    const crc = crc32(bytes);
    if (offset + compressed.length > 0xffffffff || bytes.length > 0xffffffff || name.length > 65535)
      throw new Error('ZIP64 is not supported');
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(8, 8);
    header.writeUInt16LE(33, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(bytes.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, compressed);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(20, 4);
    record.writeUInt16LE(20, 6);
    record.writeUInt16LE(0x800, 8);
    record.writeUInt16LE(8, 10);
    record.writeUInt16LE(33, 14);
    record.writeUInt32LE(crc, 16);
    record.writeUInt32LE(compressed.length, 20);
    record.writeUInt32LE(bytes.length, 24);
    record.writeUInt16LE(name.length, 28);
    record.writeUInt32LE(offset, 42);
    central.push(record, name);
    offset += header.length + name.length + compressed.length;
  }
  const index = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(index.length, 12);
  end.writeUInt32LE(offset, 16);
  const archive = Buffer.concat([...local, index, end]);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, archive);
  const sha256 = createHash('sha256').update(archive).digest('hex');
  await writeFile(`${target}.sha256`, `${sha256}  ${target.split(/[\\/]/u).at(-1)}\n`);
  return { path: target, size: archive.length, sha256 };
}
