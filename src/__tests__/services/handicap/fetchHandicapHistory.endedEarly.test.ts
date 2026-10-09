/**
 * fetchHandicapHistory — early-ended rounds stay out of the history, the
 * index shown with it, and the retroactive-recalculation candidates
 * (otherwise the same never-eligible cards would be re-picked every session
 * inside the candidate limit).
 *
 * Every card has scores: {} (legacy, no per-hole data), so A3's completeness
 * belt passes it and only the holes_played belt decides.
 */

import { fetchHandicapHistory } from '@/hooks/player/handicapHistory';

interface RecordedQuery {
  table: string;
  calls: { method: string; args: unknown[] }[];
}

const mockQueries: RecordedQuery[] = [];
const mockQueue: Record<string, { data: unknown; error: unknown }[]> = {};

/** Chainable + thenable stub; each from(table) call takes the next queued result. */
function mockRecordingQuery(table: string) {
  const recorded: RecordedQuery = { table, calls: [] };
  mockQueries.push(recorded);
  const result = mockQueue[table]?.shift() ?? { data: [], error: null };
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in', 'not', 'is', 'order', 'limit']) {
    chain[method] = (...args: unknown[]) => {
      recorded.calls.push({ method, args });
      return chain;
    };
  }
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (table: string) => mockRecordingQuery(table) },
}));

const mockRecalculate = jest.fn();
jest.mock('@/services/handicap/recalculateScorecardDifferential', () => ({
  recalculateScorecardDifferential: (...args: unknown[]) => mockRecalculate(...args),
}));

jest.mock('@/services/handicap/loadCombinedAndPairs', () => ({
  fetchCombinedHandicapRounds: () => Promise.resolve([]),
  fetchCombinableNinePairs: () => Promise.resolve([]),
}));

jest.mock('@/services/handicap/updatePlayerHandicapIndex', () => ({
  updatePlayerHandicapIndex: () => Promise.resolve(),
}));

jest.mock('@/utils/debugLogger', () => ({
  syncLogger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

function historyRow(id: string, differential: number, date: string, holesPlayed: number | null) {
  return {
    id,
    player_id: 'player-1',
    round_id: `round-${id}`,
    total_gross: 90,
    daily_handicap_used: 19,
    handicap_differential: differential,
    course_rating_used: 72.5,
    slope_rating_used: 125,
    submitted_at: `${date}T08:00:00Z`,
    scores: {},
    rounds: {
      id: `round-${id}`,
      date,
      nine_type: 'full',
      game_type: 'stroke',
      team_format: null,
      holes_played: holesPlayed,
      courses: { id: 'course-1', name: 'Test Course', clubs: { id: 'club-1', name: 'Test Club' } },
    },
  };
}

/** A recalculation candidate row (null differential) as A3-3's select returns it. */
function candidateRow(id: string, holesPlayed: number | null) {
  return { id, scores: {}, rounds: { nine_type: 'full', holes_played: holesPlayed } };
}

/** Queue results for the scorecards queries in call order: main, recalc candidates, refresh. */
function queueScorecards(...results: unknown[][]) {
  mockQueries.length = 0;
  mockQueue.scorecards = results.map((data) => ({ data, error: null }));
}

const scorecardQueries = () => mockQueries.filter((q) => q.table === 'scorecards');
const selectOf = (q: RecordedQuery) => String(q.calls.find((c) => c.method === 'select')?.args[0] ?? '');
const filtersEarlyEnded = (q: RecordedQuery) =>
  q.calls.some(
    (c) => c.method === 'is' && c.args[0] === 'rounds.holes_played' && c.args[1] === null,
  );

describe('fetchHandicapHistory — rounds that ended early', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecalculate.mockResolvedValue({ handicapDifferential: 12 });
  });

  it('lists 18-hole rounds with a differential (locks current behaviour)', async () => {
    queueScorecards([historyRow('a', 10, '2026-09-01', null)], []);

    const summary = await fetchHandicapHistory('player-1');

    expect(summary.rounds.map((r) => r.scorecardId)).toEqual(['a']);
    // 10 × 0.96
    expect(summary.handicapIndex).toBe(9.6);
  });

  it('excludes an early-ended round from the history and its index', async () => {
    queueScorecards(
      [historyRow('a', 10, '2026-09-01', null), historyRow('b', -38.4, '2026-09-10', 6)],
      [],
    );

    const summary = await fetchHandicapHistory('player-1');

    expect(filtersEarlyEnded(scorecardQueries()[0])).toBe(true);
    // Before: ['b', 'a'] and an index of −38.4 × 0.96 = −36.9.
    expect(summary.rounds.map((r) => r.scorecardId)).toEqual(['a']);
    expect(summary.handicapIndex).toBe(9.6);
  });

  it('never picks an early-ended card for retroactive recalculation', async () => {
    queueScorecards(
      [],
      [candidateRow('cand-ended-1', 6), candidateRow('cand-legacy-1', null)],
      [],
    );

    await fetchHandicapHistory('player-1');

    const candidates = scorecardQueries()[1];
    expect(selectOf(candidates)).toContain('holes_played');
    expect(filtersEarlyEnded(candidates)).toBe(true);
    // The JS belt drops a row the SQL filter missed.
    expect(mockRecalculate).toHaveBeenCalledTimes(1);
    expect(mockRecalculate).toHaveBeenCalledWith('cand-legacy-1');
  });

  it('keeps the early-ended filter on the refreshed history', async () => {
    queueScorecards(
      [],
      [candidateRow('cand-legacy-2', null)],
      [historyRow('c', 12, '2026-09-05', null), historyRow('d', -38.4, '2026-09-10', 6)],
    );

    const summary = await fetchHandicapHistory('player-1');

    const refresh = scorecardQueries()[2];
    expect(selectOf(refresh)).toContain('holes_played');
    expect(filtersEarlyEnded(refresh)).toBe(true);
    expect(summary.rounds.map((r) => r.scorecardId)).toEqual(['c']);
  });
});
