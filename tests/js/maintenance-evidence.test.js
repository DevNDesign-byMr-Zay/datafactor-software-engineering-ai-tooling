import { summarizeHistory } from '../../scripts/build-maintenance-evidence.mjs';

const record = (digit, date, author = 'Maintainer') => ({
  sha: digit.repeat(40),
  authorDate: date,
  committerDate: date,
  author,
});

test('uses the complete date range rather than assuming git log is chronologically ordered', () => {
  const result = summarizeHistory([
    record('a', '2026-03-08T23:30:00-04:00'),
    record('b', '2026-01-01T23:30:00-05:00'),
    record('c', '2026-02-01T00:00:00Z', 'Contributor'),
  ]);
  expect(result.totalCommits).toBe(3);
  expect(result.committerDates).toMatchObject({
    first: '2026-01-02T04:30:00.000Z',
    last: '2026-03-09T03:30:00.000Z',
    activeUtcDays: 3,
  });
  expect(result.authors).toEqual([
    { name: 'Maintainer', commits: 2 },
    { name: 'Contributor', commits: 1 },
  ]);
  expect(result.historyComplete).toBe(true);
});

test('separates recent burst activity from the full repository lifespan', () => {
  const records = Array.from({ length: 60 }, (_, index) => ({
    sha: index.toString(16).padStart(40, '0'),
    author: 'Maintainer',
    authorDate: index < 50 ? '2026-03-01T00:00:00Z' : '2026-01-01T00:00:00Z',
    committerDate: index < 50 ? '2026-03-01T00:00:00Z' : '2026-01-01T00:00:00Z',
  }));
  const result = summarizeHistory(records);
  expect(result.committerDates.activeUtcDays).toBe(2);
  expect(result.committerDates.elapsedDays).toBe(59);
  expect(result.recentCommitterSample.size).toBe(50);
  expect(result.recentCommitterSample.dates.activeUtcDays).toBe(1);
  expect(result.recentCommitterSample.dates.elapsedDays).toBe(0);
});

test('labels shallow history as partial instead of treating its boundaries as complete', () => {
  expect(
    summarizeHistory([record('a', '2026-01-01T00:00:00Z')], { shallow: true }).historyComplete,
  ).toBe(false);
});

test.each(['duplicate', 'date', 'empty'])(
  'rejects %s history rather than publishing misleading metrics',
  (kind) => {
    const first = record('a', '2026-01-01T00:00:00Z');
    const records =
      kind === 'empty'
        ? []
        : kind === 'duplicate'
          ? [first, first]
          : [{ ...first, committerDate: 'invalid' }];
    expect(() => summarizeHistory(records)).toThrow(/history/iu);
  },
);
