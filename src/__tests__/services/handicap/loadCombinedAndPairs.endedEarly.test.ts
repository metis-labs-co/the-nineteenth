import { fetchCombinableNinePairs } from '@/services/handicap/loadCombinedAndPairs';

/**
 * fetchCombinableNinePairs — a nine whose round was ended early is never
 * offered for combining, even when its card has no per-hole data, which the
 * card-level completeness filter (A4a) lets through.
 */

const mockResults: Record<string, { data: unknown; error: unknown }> = {};
const mockCalls: Record<string, { method: string; args: unknown[] }[]> = {};

/** Chainable + thenable stub recording every call; awaiting resolves mockResults[table]. */
function mockQuery(table: string) {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in', 'is', 'order', 'limit']) {
    chain[method] = (...args: unknown[]) => {
      mockCalls[table] = [...(mockCalls[table] ?? []), { method, args }];
      return chain;
    };
  }
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(mockResults[table] ?? { data: [], error: null }).then(resolve, reject);
  return chain;
}

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (table: string) => mockQuery(table) },
}));

/** A completed 9-hole card with no per-hole data (scores: {}), as the query returns it. */
function nineRow(
  id: string,
  nineType: 'front9' | 'back9',
  holesPlayed: number | null | undefined,
  submittedAt: string,
  absentScores = false
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
    ...(absentScores ? {} : { scores: {} }),
    rounds: {
      id: `round-${id}`,
      date: submittedAt.slice(0, 10),
      nine_type: nineType,
      ...(holesPlayed === undefined ? {} : { holes_played: holesPlayed }),
      selected_tee: { name: 'Blue' },
      courses: { id: 'course-1', name: 'Test Course', clubs: { id: 'club-1', name: 'Test Club' } },
    },
  };
}

/** Rows in the query's order (submitted_at desc). */
function seedScorecards(rows: ReturnType<typeof nineRow>[]) {
  mockResults.handicap_combined_rounds = { data: [], error: null };
  mockResults.scorecards = { data: rows, error: null };
  mockCalls.scorecards = [];
}

describe('fetchCombinableNinePairs — ended-early nines', () => {
  it('pairs nines with no hole data (locks current behaviour)', async () => {
    seedScorecards([
      nineRow('b1', 'back9', null, '2026-09-10T08:00:00Z'),
      nineRow('f1', 'front9', null, '2026-09-05T08:00:00Z'),
    ]);

    const pairs = await fetchCombinableNinePairs('player-1');

    expect(pairs).toHaveLength(1);
    expect(pairs[0].front.scorecardId).toBe('f1');
    expect(pairs[0].back.scorecardId).toBe('b1');
  });

  it('excludes ended-early rounds in the query', async () => {
    seedScorecards([]);

    await fetchCombinableNinePairs('player-1');

    const select = mockCalls.scorecards.find((c) => c.method === 'select');
    expect(String(select?.args[0])).toContain('holes_played');
    expect(String(select?.args[0])).toContain('rounds!inner');
    expect(mockCalls.scorecards).toContainEqual({
      method: 'is',
      args: ['rounds.holes_played', null],
    });
  });

  it('pairs ordinary legacy nines with absent scores and end metadata (locks current behaviour)', async () => {
    seedScorecards([
      nineRow('b1', 'back9', undefined, '2026-09-10T08:00:00Z', true),
      nineRow('f1', 'front9', undefined, '2026-09-05T08:00:00Z', true),
    ]);

    const pairs = await fetchCombinableNinePairs('player-1');

    expect(pairs).toHaveLength(1);
    expect(pairs[0].front.scorecardId).toBe('f1');
    expect(pairs[0].back.scorecardId).toBe('b1');
  });

  it('keeps existing combined source IDs excluded (locks current behaviour)', async () => {
    seedScorecards([
      nineRow('b-used', 'back9', null, '2026-09-12T08:00:00Z'),
      nineRow('f-used', 'front9', null, '2026-09-11T08:00:00Z'),
      nineRow('b1', 'back9', null, '2026-09-10T08:00:00Z'),
      nineRow('f1', 'front9', null, '2026-09-05T08:00:00Z'),
    ]);
    mockResults.handicap_combined_rounds = {
      data: [{ front_scorecard_id: 'f-used', back_scorecard_id: 'b-used' }],
      error: null,
    };

    const pairs = await fetchCombinableNinePairs('player-1');

    expect(pairs).toHaveLength(1);
    expect(pairs[0].front.scorecardId).toBe('f1');
    expect(pairs[0].back.scorecardId).toBe('b1');
  });

  it('skips an ended-early nine and pairs the latest one played in full', async () => {
    seedScorecards([
      nineRow('b-ended', 'back9', 6, '2026-09-12T08:00:00Z'),
      nineRow('b-full', 'back9', null, '2026-09-10T08:00:00Z'),
      nineRow('f1', 'front9', null, '2026-09-05T08:00:00Z'),
    ]);

    const pairs = await fetchCombinableNinePairs('player-1');

    expect(pairs).toHaveLength(1);
    // Before: 'b-ended' (the most recent back nine).
    expect(pairs[0].back.scorecardId).toBe('b-full');
  });

  it('skips an ended-early front nine before choosing the latest front', async () => {
    seedScorecards([
      nineRow('f-ended', 'front9', 6, '2026-09-12T08:00:00Z'),
      nineRow('f-full', 'front9', null, '2026-09-10T08:00:00Z'),
      nineRow('b1', 'back9', null, '2026-09-05T08:00:00Z'),
    ]);

    const pairs = await fetchCombinableNinePairs('player-1');

    expect(pairs).toHaveLength(1);
    expect(pairs[0].front.scorecardId).toBe('f-full');
  });

  it('offers no pair when the only back nine ended early', async () => {
    seedScorecards([
      nineRow('b-ended', 'back9', 6, '2026-09-10T08:00:00Z'),
      nineRow('f1', 'front9', null, '2026-09-05T08:00:00Z'),
    ]);

    expect(await fetchCombinableNinePairs('player-1')).toEqual([]);
  });
});
