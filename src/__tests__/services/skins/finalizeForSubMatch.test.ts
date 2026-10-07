/**
 * finalizeSkinsForSubMatch reads the round's hole counts like every other
 * settlement path. Sub-match rounds are competition rounds ('full'), so the
 * buy-in stays the 18-hole one. The buy-in is sized on the game's
 * participant ids, never on a (error-swallowing) players read.
 */
import { finalizeSkinsForSubMatch } from '@/services/skins/finalizeForSubMatch';

const mockFrom = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));
// A failed players read comes back as [] — settlement must not depend on it.
const mockFetchPlayerList = jest.fn().mockResolvedValue([]);
jest.mock('@/services/api/players', () => ({
  fetchPlayerListByIds: (...args: unknown[]) => mockFetchPlayerList(...args),
}));
jest.mock('@/services/errors', () => ({
  createError: (message: string) => new Error(message),
}));

type QueryResult = { data: unknown; error: unknown };

function makeTable(opts: { maybeSingle?: QueryResult[]; awaited?: QueryResult } = {}) {
  const maybes = [...(opts.maybeSingle ?? [])];
  const awaited = opts.awaited ?? { data: [], error: null };
  const table: Record<string, jest.Mock> = {};
  for (const method of ['select', 'eq', 'order', 'limit', 'insert', 'update', 'delete']) {
    table[method] = jest.fn(() => table);
  }
  table.maybeSingle = jest.fn(() => Promise.resolve(maybes.shift() ?? { data: null, error: null }));
  table.then = jest.fn(
    (onFulfilled: (value: QueryResult) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(awaited).then(onFulfilled, onRejected)
  );
  return table;
}

describe('finalizeSkinsForSubMatch', () => {
  it("prices the buy-in on the round's hole counts", async () => {
    const game = {
      id: 'g1',
      round_id: 'r1',
      sub_match_id: 'sm1',
      pot_type: 'per_hole',
      pot_value: 5,
      participant_ids: ['p1', 'p2'],
    };
    const tables = {
      skins_games: makeTable({ maybeSingle: [{ data: game, error: null }], awaited: { data: null, error: null } }),
      skins_results: makeTable({ awaited: { data: [], error: null } }),
      skins_payouts: makeTable({ awaited: { data: null, error: null } }),
      rounds: makeTable({ maybeSingle: [{ data: { nine_type: 'full' }, error: null }] }),
    };
    mockFrom.mockImplementation((name: string) => tables[name as keyof typeof tables]);

    await expect(finalizeSkinsForSubMatch('sm1')).resolves.toEqual({ finalized: true, gameId: 'g1' });

    expect(tables.rounds.eq).toHaveBeenCalledWith('id', 'r1');
    expect(mockFetchPlayerList).not.toHaveBeenCalled();
    const rows = tables.skins_payouts.insert.mock.calls[0][0] as { player_id: string; buy_in: number }[];
    expect(rows.map((r) => r.player_id)).toEqual(['p1', 'p2']);
    expect(rows.map((r) => r.buy_in)).toEqual([45, 45]); // $5 × 18 / 2
  });
});
