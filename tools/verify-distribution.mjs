/** Run with Node.js 22+ from an extracted distribution; no dependencies needed. */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyDistribution } from './distribution-files.mjs';

try {
  const directory = resolve(process.argv[2] || dirname(fileURLToPath(import.meta.url)));
  const manifest = await verifyDistribution(directory);
  console.log(`PASS: ${manifest.fileCount} distribution files match SHA-256 inventory.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
