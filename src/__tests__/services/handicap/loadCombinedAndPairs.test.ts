/**
 * fetchCombinableNinePairs — handicap completeness gate (I12).
 *
 * Only a nine scored on every hole of its own nine may be offered for
 * combining; a part-filled nine is skipped so the most recent COMPLETE
 * front/back pair is offered instead.
 */

const mockResults: Record<string, { data: unknown; error: unknown }> = {};
const mockSelects: Record<string, string[]> = {};

/** Chainable + thenable stub: every filter passes through; awaiting resolves mockResults[table]. */
function mockQuery(table: string) {
  const chain: Record<string, unknown> = {};
  const passthrough = () => chain;
  chain.select = (columns: string) => {
    mockSelects[table] = [...(mockSelects[table] ?? []), columns];
    return chain;
  };
  chain.eq = passthrough;
  chain.in = passthrough;
  chain.is = passthrough;
  chain.order = passthrough;
  chain.limit = passthrough;
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(mockResults[table] ?? { data: [], error: null }).then(resolve, reject);
  return chain;
}

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (table: string) => mockQuery(table) },
}));

import { fetchCombinableNinePairs } from '@/services/handicap/loadCombinedAndPairs';

const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

/** A completed 9-hole scorecard row as the query returns it. `null` holes = legacy card. */
function nineRow(
  id: string,
  nineType: 'front9' | 'back9',
  holeNumbers: number[] | null,
  submittedAt: string,
) {
  return {
    id,
    round_id: `round-${id}`,
    total_gross: 45,
    daily_handicap_used: 10,
    handicap_differential: null,
    course_rating_used: 36,
    slope_rating_used: 125,
    submitted_at: submittedAt,
    scores:
      holeNumbers === null
        ? null
        : Object.fromEntries(holeNumbers.map((n) => [String(n), { strokes: 5 }])),
    rounds: {
      id: `round-${id}`,
      date: submittedAt.slice(0, 10),
      nine_type: nineType,
      selected_tee: { name: 'Blue' },
      courses: { id: 'course-1', name: 'Test Course', clubs: { id: 'club-1', name: 'Test Club' } },
    },
  };
}

/** Rows in the query's order (submitted_at desc). */
function seedScorecards(rows: ReturnType<typeof nineRow>[]) {
  mockResults.handicap_combined_rounds = { data: [], error: null };
  mockResults.scorecards = { data: rows, error: null };
  mockSelects.scorecards = [];
}

describe('fetchCombinableNinePairs — completeness gate', () => {
  it('pairs the most recent complete front and back nines (I12 lock)', async () => {
    seedScorecards([
      nineRow('b1', 'back9', range(10, 18), '2026-09-10T08:00:00Z'),
      nineRow('f1', 'front9', range(1, 9), '2026-09-05T08:00:00Z'),
    ]);

    const pairs = await fetchCombinableNinePairs('player-1');

    expect(pairs).toHaveLength(1);
    expect(pairs[0].front.scorecardId).toBe('f1');
    expect(pairs[0].back.scorecardId).toBe('b1');
    // Projected: CR 36 + 36 = 72, slope (125 + 125) / 2 = 125, gross 90:
    // (113 / 125) × (90 − 72) = 16.27 → 16.3
    expect(pairs[0].projectedDifferential).toBe(16.3);
  });

  it('keeps legacy nines with no hole data combinable (I12 lock)', async () => {
    seedScorecards([
      nineRow('b-legacy', 'back9', null, '2026-09-10T08:00:00Z'),
      nineRow('f-legacy', 'front9', null, '2026-09-05T08:00:00Z'),
    ]);

    const pairs = await fetchCombinableNinePairs('player-1');

    expect(pairs).toHaveLength(1);
  });

  it('requests hole-by-hole scores', async () => {
    seedScorecards([]);

    await fetchCombinableNinePairs('player-1');

    expect(mockSelects.scorecards[0]).toContain('scores');
  });

  it('skips a part-filled nine and pairs the latest complete one', async () => {
    seedScorecards([
      nineRow('b-partial', 'back9', range(10, 15), '2026-09-12T08:00:00Z'),
      nineRow('b-full', 'back9', range(10, 18), '2026-09-10T08:00:00Z'),
      nineRow('f1', 'front9', range(1, 9), '2026-09-05T08:00:00Z'),
    ]);

    const pairs = await fetchCombinableNinePairs('player-1');

    expect(pairs).toHaveLength(1);
    expect(pairs[0].back.scorecardId).toBe('b-full');
  });

  it('offers no pair when the only back nine is incomplete', async () => {
    seedScorecards([
      nineRow('b-partial', 'back9', range(10, 15), '2026-09-12T08:00:00Z'),
      nineRow('f1', 'front9', range(1, 9), '2026-09-05T08:00:00Z'),
    ]);

    const pairs = await fetchCombinableNinePairs('player-1');

    expect(pairs).toEqual([]);
  });
});
