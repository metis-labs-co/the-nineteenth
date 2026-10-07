/**
 * fetchHandicapHistory — only full scorecards count (I12, R21).
 *
 * The handicap history list and its index skip part-filled cards on both the
 * main query and the post-recalculation refresh, and the recalculation
 * candidates skip cards that can never earn a differential.
 */

type QueryResult = { data: unknown; error: unknown };

// supabase.from('scorecards') calls, in order: main query, recalc candidates,
// then (only when a recalculation succeeded) the refresh query.
const mockScorecardResults: QueryResult[] = [];
const mockScorecardSelects: string[] = [];
const mockScorecardLimits: number[] = [];

/** Rows are queued newest first, as the real queries order them; .limit(n) cuts them like the DB. */
function mockQuery(table: string) {
  const result =
    table === 'scorecards'
      ? mockScorecardResults.shift() ?? { data: [], error: null }
      : { data: [], error: null };
  let limit: number | undefined;
  const chain: Record<string, unknown> = {};
  const passthrough = () => chain;
  chain.select = (columns: string) => {
    if (table === 'scorecards') mockScorecardSelects.push(columns);
    return chain;
  };
  chain.eq = passthrough;
  chain.in = passthrough;
  chain.not = passthrough;
  chain.is = passthrough;
  chain.order = passthrough;
  chain.limit = (n: number) => {
    if (table === 'scorecards') mockScorecardLimits.push(n);
    limit = n;
    return chain;
  };
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(
      Array.isArray(result.data) && limit !== undefined
        ? { ...result, data: result.data.slice(0, limit) }
        : result,
    ).then(resolve, reject);
  return chain;
}

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (table: string) => mockQuery(table) },
}));

const mockRecalculate = jest.fn();
jest.mock('@/services/handicap/recalculateScorecardDifferential', () => ({
  recalculateScorecardDifferential: (...args: unknown[]) => mockRecalculate(...args),
}));

jest.mock('@/services/handicap/updatePlayerHandicapIndex', () => ({
  updatePlayerHandicapIndex: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/services/handicap/loadCombinedAndPairs', () => ({
  fetchCombinedHandicapRounds: jest.fn(() => Promise.resolve([])),
  fetchCombinableNinePairs: jest.fn(() => Promise.resolve([])),
}));

jest.mock('@/utils/debugLogger', () => ({
  syncLogger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { fetchHandicapHistory } from '@/hooks/player/handicapHistory';

const PLAYER_ID = 'player-1';

const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

function holeScores(holeNumbers: number[] | null): Record<string, { strokes: number }> {
  return holeNumbers === null
    ? {}
    : Object.fromEntries(holeNumbers.map((n) => [String(n), { strokes: 5 }]));
}

/** A completed 18-hole history row. `null` holes = legacy `{}` card. */
function historyRow(id: string, differential: number, date: string, holeNumbers: number[] | null) {
  return {
    id,
    player_id: PLAYER_ID,
    round_id: `round-${id}`,
    total_gross: 90,
    daily_handicap_used: 18,
    handicap_differential: differential,
    course_rating_used: 72.5,
    slope_rating_used: 125,
    submitted_at: `${date}T08:00:00Z`,
    scores: holeScores(holeNumbers),
    rounds: {
      id: `round-${id}`,
      date,
      nine_type: 'full',
      game_type: 'stroke',
      team_format: null,
      courses: { id: 'course-1', name: 'Test Course', clubs: { id: 'club-1', name: 'Test Club' } },
    },
  };
}

/** A recalculation candidate row (null differential). */
function candidateRow(id: string, holeNumbers: number[] | null) {
  return { id, scores: holeScores(holeNumbers), rounds: { nine_type: 'full' } };
}

const COMPLETE = historyRow('sc-complete', 10.0, '2026-09-03', range(1, 18));
const LEGACY = historyRow('sc-legacy', 12.0, '2026-09-01', null);
const PARTIAL = historyRow('sc-partial', -38.4, '2026-09-05', range(1, 6));

function queueScorecards(...results: unknown[][]) {
  mockScorecardResults.length = 0;
  mockScorecardSelects.length = 0;
  mockScorecardLimits.length = 0;
  for (const rows of results) mockScorecardResults.push({ data: rows, error: null });
}

/** YYYY-MM-DD, `daysBefore` days before 30 Sep 2026. */
const dayBefore30Sep = (daysBefore: number): string =>
  new Date(Date.UTC(2026, 8, 30 - daysBefore)).toISOString().slice(0, 10);

describe('fetchHandicapHistory — full scorecards only', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecalculate.mockResolvedValue({ handicapDifferential: null });
  });

  it('lists complete and legacy cards (I12 lock)', async () => {
    queueScorecards([COMPLETE, LEGACY], []);

    const summary = await fetchHandicapHistory(PLAYER_ID);

    expect(summary.rounds.map((r) => r.scorecardId)).toEqual(['sc-complete', 'sc-legacy']);
    // 2 rounds → best 1: 10.0 × 0.96 = 9.6
    expect(summary.handicapIndex).toBe(9.6);
  });

  it('requests hole-by-hole scores on the main query', async () => {
    queueScorecards([], []);

    await fetchHandicapHistory(PLAYER_ID);

    expect(mockScorecardSelects[0]).toContain('scores');
  });

  it('drops a part-filled card from the history and the index', async () => {
    queueScorecards([PARTIAL, COMPLETE, LEGACY], []);

    const summary = await fetchHandicapHistory(PLAYER_ID);

    // Before the belt: sc-partial is listed and the index is −38.4 × 0.96 = −36.9
    expect(summary.rounds.map((r) => r.scorecardId)).toEqual(['sc-complete', 'sc-legacy']);
    expect(summary.handicapIndex).toBe(9.6);
  });

  it('drops a part-filled card from the refreshed list after a recalculation', async () => {
    const refreshedPartial = historyRow('sc-partial-refresh', -38.4, '2026-09-06', range(1, 6));
    queueScorecards(
      [COMPLETE],
      [candidateRow('cand-legacy-1', null)],
      [refreshedPartial, COMPLETE],
    );

    const summary = await fetchHandicapHistory(PLAYER_ID);

    expect(mockRecalculate).toHaveBeenCalledWith('cand-legacy-1');
    expect(mockScorecardSelects[2]).toContain('scores');
    expect(mockScorecardSelects[2]).toContain('game_type');
    expect(summary.rounds.map((r) => r.scorecardId)).toEqual(['sc-complete']);
  });

  it('never spends a recalculation on a card that can never earn a differential', async () => {
    queueScorecards(
      [COMPLETE],
      [candidateRow('cand-partial-2', range(1, 6)), candidateRow('cand-legacy-2', null)],
      [COMPLETE],
    );

    await fetchHandicapHistory(PLAYER_ID);

    expect(mockRecalculate).toHaveBeenCalledTimes(1);
    expect(mockRecalculate).toHaveBeenCalledWith('cand-legacy-2');
  });

  it('over-fetches so recent part-filled cards cannot crowd complete ones out of the history', async () => {
    // Newest first: 5 part-filled, then 22 complete (the oldest 2 fall outside the 20).
    const partials = Array.from({ length: 5 }, (_, i) =>
      historyRow(`sc-p${i}`, -38.4, dayBefore30Sep(i), range(1, 6)),
    );
    const completes = Array.from({ length: 22 }, (_, i) =>
      historyRow(`sc-c${i}`, 10.0, dayBefore30Sep(5 + i), range(1, 18)),
    );
    queueScorecards([...partials, ...completes], []);

    const summary = await fetchHandicapHistory(PLAYER_ID);

    expect(mockScorecardLimits[0]).toBe(60);
    // With .limit(20) only 15 complete cards would be left after the belt.
    expect(summary.rounds.map((r) => r.scorecardId)).toEqual(
      Array.from({ length: 20 }, (_, i) => `sc-c${i}`),
    );
  });
});
