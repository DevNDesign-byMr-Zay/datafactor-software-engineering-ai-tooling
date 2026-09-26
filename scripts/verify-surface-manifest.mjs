import { createHash } from 'node:crypto';
import { access, readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const surfacePath = resolve(root, 'config/maintained-surface.json');

function assert(condition, message) {
  if (!condition) throw new TypeError(message);
}

function safeRelative(value, label) {
  assert(typeof value === 'string' && value.trim(), `${label} must be a non-empty path`);
  assert(!value.includes('*') && !value.includes('?') && !value.startsWith('/') && !value.includes('..'), `${label} must be an exact repository-relative path`);
  const resolved = resolve(root, value);
  assert(resolved === root || resolved.startsWith(`${root}${sep}`), `${label} escapes repository root`);
  return resolved;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function gitBlobSha1(data) {
  const header = Buffer.from(`blob ${data.length}\0`);
  return createHash('sha1').update(header).update(data).digest('hex');
}

const surface = JSON.parse(await readFile(surfacePath, 'utf8'));
assert(surface.schemaVersion === 2, 'maintained-surface schemaVersion must be 2');
assert(Array.isArray(surface.maintainedRoots) && surface.maintainedRoots.length > 0, 'maintainedRoots must be non-empty');
assert(Array.isArray(surface.promotedMaintainedArtifacts), 'promotedMaintainedArtifacts must be an array');

for (const [index, value] of surface.maintainedRoots.entries()) {
  const path = safeRelative(value, `maintainedRoots[${index}]`);
  assert((await stat(path)).isDirectory(), `maintainedRoots[${index}] must reference a directory`);
}

const archive = surface.historicalArchive;
assert(archive?.releaseTag === 'v1.2.2', 'archive release tag drifted');
assert(archive?.releaseCommit === '25bf8b9e36b327b3001f8b12cd0709cf7f1b84ad', 'archive release commit drifted');
assert(archive?.releaseTree === 'cf7e5cfa5398cd8739b9bba2c6db5047f88e2231', 'archive release tree drifted');
assert(archive?.archiveBranch === 'archive/historical-corpus-v1.2.2', 'archive branch drifted');
assert(archive?.fileCount === 1610, 'archive file count must remain 1610');
assert(archive?.directoryCount === 40, 'archive directory count must remain 40');
assert(archive?.totalBytes === 1733733, 'archive byte count drifted');
assert(archive?.canonicalInventorySha256 === 'cc5592a67d0d68009489b0cc1a6a575f553ff800e7b3d9775c62206d8f863409', 'archive inventory digest drifted');

const archiveManifest = JSON.parse(await readFile(safeRelative(archive.manifest, 'historicalArchive.manifest'), 'utf8'));
assert(archiveManifest.release_tag === archive.releaseTag, 'archive manifest release tag mismatch');
assert(archiveManifest.release_commit === archive.releaseCommit, 'archive manifest release commit mismatch');
assert(archiveManifest.release_tree === archive.releaseTree, 'archive manifest release tree mismatch');
assert(archiveManifest.corpus_file_count === archive.fileCount, 'archive manifest file count mismatch');
assert(archiveManifest.corpus_directory_count === archive.directoryCount, 'archive manifest directory count mismatch');
assert(archiveManifest.corpus_total_bytes === archive.totalBytes, 'archive manifest byte count mismatch');
assert(archiveManifest.canonical_inventory_sha256 === archive.canonicalInventorySha256, 'archive manifest inventory digest mismatch');
assert(Array.isArray(archiveManifest.files) && archiveManifest.files.length === 1610, 'archive manifest must list every released historical file');

const corpusRoot = safeRelative(archive.corpusRootAtRelease, 'historicalArchive.corpusRootAtRelease');
assert(!(await exists(corpusRoot)), 'historical corpus must remain outside the scored maintained tree');

const archiveByPath = new Map(archiveManifest.files.map((entry) => [entry.path, entry]));
const promoted = new Set();
for (const [index, artifact] of surface.promotedMaintainedArtifacts.entries()) {
  const path = safeRelative(artifact.path, `promotedMaintainedArtifacts[${index}].path`);
  assert((await stat(path)).isFile(), `promotedMaintainedArtifacts[${index}] must reference a file`);
  assert(!promoted.has(artifact.path), 'promoted maintained artifact paths must be unique');
  promoted.add(artifact.path);

  const archived = archiveByPath.get(artifact.archivePath);
  assert(archived, `archive path missing from full corpus manifest: ${artifact.archivePath}`);
  assert(archived.git_blob_sha1 === artifact.gitBlobSha1, `archive blob identity mismatch: ${artifact.archivePath}`);
  assert(archived.bytes === artifact.bytes, `archive byte count mismatch: ${artifact.archivePath}`);

  const data = await readFile(path);
  assert(data.length === artifact.bytes, `promoted byte count drift: ${artifact.path}`);
  assert(gitBlobSha1(data) === artifact.gitBlobSha1, `promoted Git blob identity drift: ${artifact.path}`);
}

process.stdout.write(
  `surface manifest verified: ${surface.maintainedRoots.length} maintained roots, ${promoted.size} promoted maintained artifacts, ${archive.fileCount} historical files externalized\n`,
);
