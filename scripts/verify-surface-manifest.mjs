import { access, readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const manifestPath = resolve(root, 'config/maintained-surface.json');
const attributesPath = resolve(root, '.gitattributes');

function assertSafeRelativePath(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  if (value.includes('*') || value.includes('?') || value.startsWith('/') || value.includes('..')) {
    throw new TypeError(`${label} must be an exact repository-relative path`);
  }
  const resolved = resolve(root, value);
  if (resolved !== root && !resolved.startsWith(`${root}${sep}`)) {
    throw new TypeError(`${label} escapes the repository root`);
  }
  return resolved;
}

const [manifestSource, attributes] = await Promise.all([
  readFile(manifestPath, 'utf8'),
  readFile(attributesPath, 'utf8'),
]);
const manifest = JSON.parse(manifestSource);

if (manifest.schemaVersion !== 1) {
  throw new TypeError('maintained-surface schemaVersion must be 1');
}
if (!Array.isArray(manifest.maintainedRoots) || manifest.maintainedRoots.length === 0) {
  throw new TypeError('maintainedRoots must be a non-empty array');
}
if (!Array.isArray(manifest.promotedHistoricalArtifacts)) {
  throw new TypeError('promotedHistoricalArtifacts must be an array');
}

const historicalRoot = assertSafeRelativePath(
  manifest.historicalCorpusRoot,
  'historicalCorpusRoot',
);
if (!(await stat(historicalRoot)).isDirectory()) {
  throw new TypeError('historicalCorpusRoot must reference a directory');
}

const historicalStatisticsRule = `"${manifest.historicalCorpusRoot}/**" linguist-detectable=false`;
if (!attributes.includes(historicalStatisticsRule)) {
  throw new TypeError('historical corpus must be excluded from active language statistics');
}

for (const [index, value] of manifest.maintainedRoots.entries()) {
  const path = assertSafeRelativePath(value, `maintainedRoots[${index}]`);
  if (!(await stat(path)).isDirectory()) {
    throw new TypeError(`maintainedRoots[${index}] must reference a directory`);
  }
  if (path === historicalRoot || path.startsWith(`${historicalRoot}${sep}`)) {
    throw new TypeError('historical corpus cannot be declared as a maintained root');
  }
}

const promoted = new Set();
for (const [index, value] of manifest.promotedHistoricalArtifacts.entries()) {
  const path = assertSafeRelativePath(value, `promotedHistoricalArtifacts[${index}]`);
  if (!path.startsWith(`${historicalRoot}${sep}`)) {
    throw new TypeError('promoted historical artifacts must live under historicalCorpusRoot');
  }
  if (promoted.has(path)) {
    throw new TypeError('promoted historical artifacts must be unique');
  }
  promoted.add(path);
  await access(path);

  const promotedStatisticsRule = `"${value}" linguist-detectable=true`;
  if (!attributes.includes(promotedStatisticsRule)) {
    throw new TypeError(`promoted historical artifact must remain detectable: ${value}`);
  }
}

process.stdout.write(
  `surface manifest verified: ${manifest.maintainedRoots.length} maintained roots, ${promoted.size} promoted historical artifacts\n`,
);
