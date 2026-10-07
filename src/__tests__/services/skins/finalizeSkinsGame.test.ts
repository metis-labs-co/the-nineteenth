/**
 * finalizeSkinsGame / finalizeActiveSkinsForRound (and, from A5b-2,
 * awardSkinsAchievements) — the non-hook skins settlement used by useFinalizeSkinsGame and the queued
 * "finalise round" sync item.
 */
import {
  awardSkinsAchievements,
  finalizeActiveSkinsForRound,
  finalizeSkinsGame,
} from '@/services/skins/finalizeSkinsGame';
import type { SkinsGame } from '@/types/database/skins.types';

const mockFrom = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

// The settlement must NOT size the buy-in on a players read: this helper logs
// and swallows errors, so a failed read returned [] (wrong divisor, no rows).
const mockFetchPlayerList = jest.fn();
jest.mock('@/services/api/players', () => ({
  fetchPlayerListByIds: (...args: unknown[]) => mockFetchPlayerList(...args),
}));

jest.mock('@/services/errors', () => ({
  createError: (message: string) => new Error(message),
}));

type QueryResult = { data: unknown; error: unknown };

/**
 * PostgREST stand-in: filters chain; `single` / `maybeSingle` resolve the
 * queued results in order; awaiting the chain itself resolves `awaited`.
 */
function makeTable(opts: { single?: QueryResult[]; maybeSingle?: QueryResult[]; awaited?: QueryResult } = {}) {
  const singles = [...(opts.single ?? [])];
  const maybes = [...(opts.maybeSingle ?? [])];
  const awaited = opts.awaited ?? { data: [], error: null };
  const table: Record<string, jest.Mock> = {};
  for (const method of ['select', 'eq', 'order', 'limit', 'insert', 'update', 'delete', 'not']) {
    table[method] = jest.fn(() => table);
  }
  table.single = jest.fn(() => Promise.resolve(singles.shift() ?? { data: null, error: null }));
  table.maybeSingle = jest.fn(() => Promise.resolve(maybes.shift() ?? { data: null, error: null }));
  table.then = jest.fn(
    (onFulfilled: (value: QueryResult) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(awaited).then(onFulfilled, onRejected)
  );
  return table;
}

// per_hole $5, two players
const GAME: SkinsGame = {
  id: 'g1',
  round_id: 'r1',
  pairing_id: null,
  sub_match_id: null,
  participant_ids: ['p1', 'p2'],
  pot_type: 'per_hole',
  pot_value: 5,
  currency: 'AUD',
  scoring_type: 'gross',
  status: 'active',
  disclaimer_accepted_at: '2026-10-07T00:00:00Z',
  disclaimer_accepted_by: 'p1',
  created_by: 'p1',
  created_at: '2026-10-07T00:00:00Z',
  updated_at: '2026-10-07T00:00:00Z',
  completed_at: null,
  is_team_skins: false,
  participant_team_ids: null,
};

/** One $5 skin per hole, won by the listed player, holes numbered from 1. */
function wonHoles(winners: string[]) {
  return winners.map((winner, i) => ({
    hole_number: i + 1,
    winner_id: winner,
    is_carryover: false,
    payout_amount: 5,
    carryover_to_next: 0,
    hole_scores: {
      p1: { gross: 4, net: 4, strokes_received: 0 },
      p2: { gross: 4, net: 4, strokes_received: 0 },
    },
  }));
}

function wire({
  results = [] as unknown[],
  resultsError = null as unknown,
  nineType = 'full' as string | null,
  activeGame = GAME as SkinsGame | null,
  game = GAME as SkinsGame | null,
} = {}) {
  const tables = {
    skins_games: makeTable({
      single: [
        { data: game, error: game ? null : { message: 'missing' } },
        { data: game ? { ...game, status: 'completed' } : null, error: null },
      ],
      maybeSingle: [{ data: activeGame, error: null }],
    }),
    skins_results: makeTable({ awaited: { data: results, error: resultsError } }),
    skins_payouts: makeTable({ awaited: { data: null, error: null } }),
    rounds: makeTable({ maybeSingle: [{ data: { nine_type: nineType }, error: null }] }),
  };
  mockFrom.mockImplementation((name: string) => tables[name as keyof typeof tables]);
  return tables;
}

type InsertedPayout = { player_id: string; buy_in: number; net_result: number };

describe('finalizeSkinsGame', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockFetchPlayerList.mockReset();
    // What the swallowed-error players read returns; settlement must not use it.
    mockFetchPlayerList.mockResolvedValue([]);
  });

  it('keeps the full-18 buy-in for a full round (pinned: unchanged from today)', async () => {
    // Ann wins 2 holes ($10), Bob 1 ($5); buy-in $5 × 18 / 2 = $45
    const tables = wire({ nineType: 'full', results: wonHoles(['p1', 'p1', 'p2']) });

    await finalizeSkinsGame('g1');

    const rows = tables.skins_payouts.insert.mock.calls[0][0] as InsertedPayout[];
    expect(rows.map((r) => r.buy_in)).toEqual([45, 45]);
    expect(rows.map((r) => r.net_result)).toEqual([-35, -40]); // 10 - 45, 5 - 45
  });

  it('settles a 9-hole round zero-sum, priced on the round nine type', async () => {
    // Ann wins holes 1–5 ($25), Bob 6–9 ($20); buy-in $5 × 9 / 2 = $22.50
    const tables = wire({
      nineType: 'front9',
      results: wonHoles(['p1', 'p1', 'p1', 'p1', 'p1', 'p2', 'p2', 'p2', 'p2']),
    });

    await finalizeSkinsGame('g1');

    expect(tables.rounds.eq).toHaveBeenCalledWith('id', 'r1');
    const rows = tables.skins_payouts.insert.mock.calls[0][0] as InsertedPayout[];
    expect(rows.map((r) => r.buy_in)).toEqual([22.5, 22.5]);
    expect(rows.map((r) => r.net_result)).toEqual([2.5, -2.5]);
    expect(rows.reduce((sum, r) => sum + r.net_result, 0)).toBeCloseTo(0, 2);
  });

  it("sizes the buy-in on the game's participant ids, never on a players read", async () => {
    // Ann wins 1 ($5); buy-in $5 × 18 / 2 = $45 — two rows even though the
    // players read would have come back empty
    const tables = wire({ results: wonHoles(['p1']) });

    await finalizeSkinsGame('g1');

    expect(mockFetchPlayerList).not.toHaveBeenCalled();
    const rows = tables.skins_payouts.insert.mock.calls[0][0] as InsertedPayout[];
    expect(rows.map((r) => r.player_id)).toEqual(['p1', 'p2']);
    expect(rows.map((r) => r.buy_in)).toEqual([45, 45]);
  });

  it('replaces old payouts, marks the game completed and returns it', async () => {
    const tables = wire({ results: wonHoles(['p1']) });

    const settled = await finalizeSkinsGame('g1');

    expect(tables.skins_payouts.delete).toHaveBeenCalled();
    expect(tables.skins_games.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' })
    );
    expect(settled.status).toBe('completed');
  });

  it('throws when the game does not exist', async () => {
    wire({ game: null });

    await expect(finalizeSkinsGame('g1')).rejects.toThrow('Skins game not found');
  });
});

describe('finalizeActiveSkinsForRound', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockFetchPlayerList.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports nothing finalised when the round has no active game', async () => {
    const tables = wire({ activeGame: null });

    await expect(finalizeActiveSkinsForRound('r1')).resolves.toEqual({ finalized: false });
    expect(tables.skins_payouts.insert).not.toHaveBeenCalled();
  });

  it("settles the round's active game, priced on the round, and returns it", async () => {
    const tables = wire({ nineType: 'front9', results: wonHoles(['p1', 'p2']) });

    const outcome = await finalizeActiveSkinsForRound('r1');

    expect(tables.skins_games.eq).toHaveBeenCalledWith('round_id', 'r1');
    expect(tables.skins_games.eq).toHaveBeenCalledWith('status', 'active');
    const rows = tables.skins_payouts.insert.mock.calls[0][0] as InsertedPayout[];
    expect(rows.map((r) => r.buy_in)).toEqual([22.5, 22.5]); // $5 × 9 / 2
    expect(outcome).toEqual({
      finalized: true,
      game: expect.objectContaining({ id: 'g1', status: 'completed' }),
    });
  });

  it('never throws — a failed settlement comes back as the error (so a queued finalise can retry)', async () => {
    wire({ resultsError: { message: 'boom' } });

    const outcome = await finalizeActiveSkinsForRound('r1');

    expect(outcome.finalized).toBe(false);
    expect(outcome.error).toBeInstanceOf(Error);
    expect((outcome.error as Error).message).toBe('Failed to fetch results: boom');
  });

  it('reports a failed hole-count read as the error, without settling', async () => {
    const tables = wire({ results: wonHoles(['p1']) });
    tables.rounds.maybeSingle.mockReset();
    tables.rounds.maybeSingle.mockResolvedValue({ data: null, error: { message: 'timeout' } });

    const outcome = await finalizeActiveSkinsForRound('r1');

    expect(outcome.finalized).toBe(false);
    expect((outcome.error as Error).message).toBe('Failed to load round for skins pricing: timeout');
    expect(tables.skins_payouts.insert).not.toHaveBeenCalled();
  });
});

describe('awardSkinsAchievements', () => {
  const NO_REWARDS = { hasNewRewards: false, newAchievements: [], newCosmetics: [], progressUpdates: [] };

  function wireAchievements(holesWon: number, wins: { payout_amount: number }[]) {
    const payouts = makeTable({ single: [{ data: { holes_won: holesWon, holes_tied: 0 }, error: null }] });
    const results = makeTable({ awaited: { data: wins, error: null } });
    mockFrom.mockImplementation((table: string) => (table === 'skins_payouts' ? payouts : results));
    return { payouts, results };
  }

  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("fires game-completed and hole-won events with the player's holes and carryover wins", async () => {
    // pot_value $5: the $10 win carried a hole over, the $5 win did not → 1 carryover win
    const { payouts } = wireAchievements(2, [{ payout_amount: 10 }, { payout_amount: 5 }]);
    const checkAndAward = jest.fn().mockResolvedValue(NO_REWARDS);
    const showMultipleToasts = jest.fn();

    await awardSkinsAchievements(GAME, { playerId: 'p1', checkAndAward, showMultipleToasts });

    expect(payouts.eq).toHaveBeenCalledWith('skins_game_id', 'g1');
    expect(payouts.eq).toHaveBeenCalledWith('player_id', 'p1');
    expect(checkAndAward).toHaveBeenCalledWith('skins_game_completed', { skins_holes_won: 2 });
    expect(checkAndAward).toHaveBeenCalledWith('skins_hole_won', {
      skins_holes_won: 2,
      skins_carryover_holes_won: 1,
    });
    expect(showMultipleToasts).not.toHaveBeenCalled();
  });

  it('skips the hole-won event when the player won no holes', async () => {
    wireAchievements(0, []);
    const checkAndAward = jest.fn().mockResolvedValue(NO_REWARDS);

    await awardSkinsAchievements(GAME, { playerId: 'p1', checkAndAward, showMultipleToasts: jest.fn() });

    expect(checkAndAward).toHaveBeenCalledTimes(1);
    expect(checkAndAward).toHaveBeenCalledWith('skins_game_completed', { skins_holes_won: 0 });
  });

  it('shows toasts for new rewards', async () => {
    wireAchievements(1, []);
    const achievement = { code: 'skins_rookie' };
    const checkAndAward = jest.fn().mockResolvedValue({
      ...NO_REWARDS,
      hasNewRewards: true,
      newAchievements: [achievement],
    });
    const showMultipleToasts = jest.fn();

    await awardSkinsAchievements(GAME, { playerId: 'p1', checkAndAward, showMultipleToasts });

    expect(showMultipleToasts).toHaveBeenCalledWith([achievement], []);
  });

  it('never throws when the lookup fails', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('offline');
    });
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      awardSkinsAchievements(GAME, {
        playerId: 'p1',
        checkAndAward: jest.fn(),
        showMultipleToasts: jest.fn(),
      })
    ).resolves.toBeUndefined();
    consoleWarn.mockRestore();
  });
});
