/**
 * updatePlayerHandicapIndex — early-ended rounds never feed the index.
 *
 * The card gate (A3) and the server trigger (A7/B1a) keep their differentials
 * null; this belt also excludes any round with rounds.holes_played set, in the
 * query and in the loop. Every card has scores: {} (legacy, no per-hole data),
 * so A3's completeness belt passes it and only the holes_played belt decides.
 */

import { updatePlayerHandicapIndex } from '@/services/handicap/updatePlayerHandicapIndex';

interface RecordedQuery {
  table: string;
  calls: { method: string; args: unknown[] }[];
}

const mockQueries: RecordedQuery[] = [];
const mockResults: Record<string, { data?: unknown; error: unknown }> = {};

/** Chainable + thenable stub recording every call; awaiting resolves mockResults[table]. */
function mockRecordingQuery(table: string) {
  const recorded: RecordedQuery = { table, calls: [] };
  mockQueries.push(recorded);
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in', 'not', 'is', 'order', 'limit', 'update']) {
    chain[method] = (...args: unknown[]) => {
      recorded.calls.push({ method, args });
      return chain;
    };
  }
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(mockResults[table] ?? { data: [], error: null }).then(resolve, reject);
  return chain;
}

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (table: string) => mockRecordingQuery(table) },
}));

jest.mock('@/services/queryClient', () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));

jest.mock('@/utils/debugLogger', () => ({
  syncLogger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

function indexRow(differential: number, date: string, holesPlayed: number | null) {
  return {
    handicap_differential: differential,
    submitted_at: `${date}T08:00:00Z`,
    scores: {},
    rounds: { nine_type: 'full', game_type: 'stroke', team_format: null, holes_played: holesPlayed },
  };
}

function seed(rows: unknown[]) {
  mockQueries.length = 0;
  mockResults.scorecards = { data: rows, error: null };
  mockResults.handicap_combined_rounds = { data: [], error: null };
  // Both the index write and A3-2's clear (`.update().eq().not().select('id')`)
  // resolve this; the clear sees no changed rows and skips invalidation.
  mockResults.players = { data: [], error: null };
}

const scorecardQuery = () => mockQueries.find((q) => q.table === 'scorecards')!;
const indexWritten = () =>
  (mockQueries.find((q) => q.table === 'players')?.calls.find((c) => c.method === 'update')
    ?.args[0] ?? {}) as Record<string, unknown>;

describe('updatePlayerHandicapIndex — rounds that ended early', () => {
  it('derives the index from 18-hole differentials (locks current behaviour)', async () => {
    seed([indexRow(10, '2026-09-01', null)]);

    await updatePlayerHandicapIndex('player-1');

    // 1 round → best 1 → 10 × 0.96 = 9.6
    expect(indexWritten().handicap_index).toBe(9.6);
  });

  it('excludes early-ended rounds in the query', async () => {
    seed([]);

    await updatePlayerHandicapIndex('player-1');

    const select = scorecardQuery().calls.find((c) => c.method === 'select');
    expect(String(select?.args[0])).toContain('holes_played');
    expect(scorecardQuery().calls).toContainEqual({ method: 'is', args: ['rounds.holes_played', null] });
  });

  it('ignores an early-ended differential that slipped through', async () => {
    seed([indexRow(10, '2026-09-01', null), indexRow(-38.4, '2026-09-10', 6)]);

    await updatePlayerHandicapIndex('player-1');

    // Before: 2 rounds → best 1 → −38.4 × 0.96 = −36.864 → −36.9
    expect(indexWritten().handicap_index).toBe(9.6);
  });

  it('clears the index when an early-ended round was the only one', async () => {
    seed([indexRow(-38.4, '2026-09-10', 6)]);

    await updatePlayerHandicapIndex('player-1');

    // Every row skipped by a belt → A3-2's clearHandicapIndex. Before: −36.9.
    expect(indexWritten().handicap_index).toBeNull();
  });
});
