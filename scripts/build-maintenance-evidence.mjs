import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function dateRange(values) {
  const first = values.reduce((a, b) => Math.min(a, b));
  const last = values.reduce((a, b) => Math.max(a, b));
  return {
    first: new Date(first).toISOString(),
    last: new Date(last).toISOString(),
    elapsedDays: Number(((last - first) / 86400000).toFixed(2)),
    calendarSpanDays: Math.floor(last / 86400000) - Math.floor(first / 86400000) + 1,
    activeUtcDays: new Set(values.map((value) => new Date(value).toISOString().slice(0, 10))).size,
  };
}

export function summarizeHistory(records, { shallow = false } = {}) {
  if (!Array.isArray(records) || !records.length) throw new Error('Empty Git history');
  const seen = new Set();
  const authors = new Map();
  const parsed = records.map((record) => {
    if (
      !record ||
      !/^[a-f0-9]{40}$/u.test(record.sha) ||
      seen.has(record.sha) ||
      typeof record.author !== 'string' ||
      !record.author.trim() ||
      typeof record.authorDate !== 'string' ||
      typeof record.committerDate !== 'string'
    ) {
      throw new Error('Invalid or duplicate Git history record');
    }
    const authorTime = Date.parse(record.authorDate),
      committerTime = Date.parse(record.committerDate);
    if (!Number.isFinite(authorTime) || !Number.isFinite(committerTime))
      throw new Error('Invalid Git history date');
    seen.add(record.sha);
    authors.set(record.author, (authors.get(record.author) ?? 0) + 1);
    return { authorTime, committerTime };
  });
  const recent = [...parsed].sort((a, b) => b.committerTime - a.committerTime).slice(0, 50);
  return {
    historyComplete: !shallow,
    totalCommits: records.length,
    authorDates: dateRange(parsed.map((record) => record.authorTime)),
    committerDates: dateRange(parsed.map((record) => record.committerTime)),
    authors: [...authors]
      .map(([name, commits]) => ({ name, commits }))
      .sort((a, b) => b.commits - a.commits || a.name.localeCompare(b.name)),
    recentCommitterSample: {
      size: recent.length,
      dates: dateRange(recent.map((record) => record.committerTime)),
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 4 || process.argv[2] !== '--output')
      throw new Error('Usage: build-maintenance-evidence.mjs --output FILE');
    const git = (...args) =>
      execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();
    const commit = git('rev-parse', 'HEAD');
    if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== commit)
      throw new Error('Git history does not match the tested commit');
    const records = git('log', '--format=%H%x00%aI%x00%cI%x00%an', 'HEAD')
      .split('\n')
      .map((line) => {
        const fields = line.split('\u0000');
        if (fields.length !== 4) throw new Error('Invalid Git history framing');
        const [sha, authorDate, committerDate, author] = fields;
        return { sha, authorDate, committerDate, author };
      });
    const evidence = {
      schemaVersion: 1,
      evidenceType: 'git-maintenance-history',
      commit,
      ...summarizeHistory(records, {
        shallow: git('rev-parse', '--is-shallow-repository') === 'true',
      }),
      interpretation:
        'Observed Git metadata, not proof of steady maintenance or a quality rating. Full lifespan and the recent 50-commit window are separate; shallow history is incomplete.',
    };
    const serialized = JSON.stringify(evidence, null, 2) + '\n';
    await writeFile(process.argv[3], serialized);
    process.stdout.write(serialized);
  } catch (error) {
    process.stderr.write(error.message + '\n');
    process.exitCode = 1;
  }
}
