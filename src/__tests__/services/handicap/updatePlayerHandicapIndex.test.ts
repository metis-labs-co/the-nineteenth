// src/__tests__/services/handicap/updatePlayerHandicapIndex.test.ts
/**
 * updatePlayerHandicapIndex — only full scorecards count (I12, R21).
 *
 * A part-filled card that still carries a stored differential (an old
 * client, or data from before the server trigger) must not reach the index.
 * Legacy cards with no per-hole data keep counting.
 */

const mockUpdates: Record<string, unknown>[] = [];
const mockUpdateFilters: unknown[][][] = [];
const mockSelects: Record<string, string[]> = {};
const mockLimits: Record<string, number[]> = {};
let mockScorecardRows: unknown[] = [];

/**
 * Chainable + thenable stub: filters pass through; awaiting resolves the
 * table's rows (newest first, as the real query orders them), cut to .limit(n)
 * like the database would.
 */
function mockQuery(table: string) {
  let limit: number | undefined;
  const rows = (): unknown[] => {
    const all = table === 'scorecards' ? mockScorecardRows : [];
    return limit === undefined ? all : all.slice(0, limit);
  };
  const chain: Record<string, unknown> = {};
  const passthrough = () => chain;
  chain.select = (columns: string) => {
    mockSelects[table] = [...(mockSelects[table] ?? []), columns];
    return chain;
  };
  chain.eq = passthrough;
  chain.in = passthrough;
  chain.not = passthrough;
  chain.is = passthrough;
  chain.order = passthrough;
  chain.limit = (n: number) => {
    mockLimits[table] = [...(mockLimits[table] ?? []), n];
    limit = n;
    return chain;
  };
  chain.update = (values: Record<string, unknown>) => {
    mockUpdates.push(values);
    const filters: unknown[][] = [];
    mockUpdateFilters.push(filters);
    // Awaited directly (the index write) or through .select('id') (the clear,
    // which reports the rows it changed).
    const updateChain: Record<string, unknown> = {};
    updateChain.eq = (...args: unknown[]) => {
      filters.push(['eq', ...args]);
      return updateChain;
    };
    updateChain.not = (...args: unknown[]) => {
      filters.push(['not', ...args]);
      return updateChain;
    };
    updateChain.select = () => Promise.resolve({ data: [{ id: 'player-1' }], error: null });
    updateChain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ error: null }).then(resolve, reject);
    return updateChain;
  };
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve({ data: rows(), error: null }).then(resolve, reject);
  return chain;
}

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (table: string) => mockQuery(table) },
}));

jest.mock('@/services/queryClient', () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));

jest.mock('@/utils/debugLogger', () => ({
  syncLogger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { updatePlayerHandicapIndex } from '@/services/handicap/updatePlayerHandicapIndex';

const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

/** A completed 18-hole card row as the query returns it. `null` holes = legacy `{}` card. */
function cardRow(differential: number, submittedAt: string, holeNumbers: number[] | null) {
  return {
    handicap_differential: differential,
    submitted_at: submittedAt,
    scores:
      holeNumbers === null
        ? {}
        : Object.fromEntries(holeNumbers.map((n) => [String(n), { strokes: 5 }])),
    rounds: { nine_type: 'full', game_type: 'stroke', team_format: null },
  };
}

const COMPLETE = cardRow(10.0, '2026-09-03T08:00:00Z', range(1, 18));
const LEGACY = cardRow(12.0, '2026-09-01T08:00:00Z', null);
const PARTIAL = cardRow(-38.4, '2026-09-05T08:00:00Z', range(1, 6));

/** `count` cards, newest first, starting `startDaysAgo` days before 30 Sep 2026. */
function cardsNewestFirst(
  count: number,
  differential: number,
  holeNumbers: number[] | null,
  startDaysAgo: number,
) {
  return Array.from({ length: count }, (_, i) =>
    cardRow(
      differential,
      new Date(Date.UTC(2026, 8, 30 - startDaysAgo - i, 8)).toISOString(),
      holeNumbers,
    ),
  );
}

describe('updatePlayerHandicapIndex — full scorecards only', () => {
  beforeEach(() => {
    mockUpdates.length = 0;
    mockUpdateFilters.length = 0;
    for (const key of Object.keys(mockSelects)) delete mockSelects[key];
    for (const key of Object.keys(mockLimits)) delete mockLimits[key];
  });

  it('indexes complete and legacy cards (I12 lock)', async () => {
    mockScorecardRows = [COMPLETE, LEGACY];

    await updatePlayerHandicapIndex('player-1');

    // 2 rounds → best 1: 10.0 × 0.96 = 9.6
    expect(mockUpdates).toHaveLength(1);
    expect(mockUpdates[0]).toEqual(expect.objectContaining({ handicap_index: 9.6 }));
  });

  it('requests hole-by-hole scores', async () => {
    mockScorecardRows = [];

    await updatePlayerHandicapIndex('player-1');

    expect(mockSelects.scorecards[0]).toContain('scores');
  });

  it('skips a part-filled card that still carries a differential', async () => {
    mockScorecardRows = [PARTIAL, COMPLETE, LEGACY];

    await updatePlayerHandicapIndex('player-1');

    // Before the belt: best 1 of 3 = −38.4 × 0.96 = −36.9
    expect(mockUpdates[0]).toEqual(expect.objectContaining({ handicap_index: 9.6 }));
  });

  it('clears a stale index when every card is incomplete', async () => {
    mockScorecardRows = [PARTIAL];

    await updatePlayerHandicapIndex('player-1');

    // Before the belt: the partial card alone → −38.4 × 0.96 = −36.9 is written.
    expect(mockUpdates).toEqual([
      { handicap_index: null, handicap_index_updated_at: expect.any(String) },
    ]);
    // Only a row that still holds an index is touched.
    expect(mockUpdateFilters[0]).toEqual([
      ['eq', 'id', 'player-1'],
      ['not', 'handicap_index', 'is', null],
    ]);
  });

  it('clears a stale index when no qualifying round remains at all', async () => {
    // e.g. the player's only differentials were part-filled cards nulled by A7.
    mockScorecardRows = [];

    await updatePlayerHandicapIndex('player-1');

    expect(mockUpdates).toEqual([
      { handicap_index: null, handicap_index_updated_at: expect.any(String) },
    ]);
  });

  it('over-fetches so recent part-filled cards cannot crowd complete ones out of the window', async () => {
    // Newest first: 5 part-filled, then 15 complete at 20.0, then 5 older complete at 0.0.
    mockScorecardRows = [
      ...cardsNewestFirst(5, -38.4, range(1, 6), 0),
      ...cardsNewestFirst(15, 20.0, range(1, 18), 5),
      ...cardsNewestFirst(5, 0.0, range(1, 18), 20),
    ];

    await updatePlayerHandicapIndex('player-1');

    expect(mockLimits.scorecards).toEqual([60]);
    // 20 qualifying cards → best 8: 5 × 0.0 + 3 × 20.0 = 60 / 8 = 7.5 × 0.96 = 7.2.
    // With .limit(20) the fetch stops at the 15 × 20.0 cards: best 5 of 15 → 19.2.
    expect(mockUpdates).toEqual([expect.objectContaining({ handicap_index: 7.2 })]);
  });

  it('keeps the stored index when the whole over-fetch is part-filled', async () => {
    // 60 part-filled rows: older qualifying cards may lie beyond the fetch,
    // so nothing proves the index stale — do not wipe it.
    mockScorecardRows = cardsNewestFirst(60, -38.4, range(1, 6), 0);

    await updatePlayerHandicapIndex('player-1');

    expect(mockUpdates).toEqual([]);
  });
});
