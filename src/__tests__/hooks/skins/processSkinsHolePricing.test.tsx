/**
 * Per-hole skins pricing: a hole is worth pot / planned holes (9 for a
 * front/back nine), not pot / 18.
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProcessSkinsHole, useProcessTeamSkinsHole } from '@/hooks/skins/mutations';
import type { SkinsHoleScores, SkinsTeamHoleScores } from '@/types/database/skins.types';

const mockFrom = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));
jest.mock('@/services/api/players', () => ({ fetchPlayerListByIds: jest.fn() }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('@/hooks/achievements/useCheckAchievements', () => ({
  useCheckAchievements: () => ({ checkAndAward: jest.fn(), isReady: false }),
}));
jest.mock('@/context/AchievementToastContext', () => ({
  useAchievementToast: () => ({ showMultipleToasts: jest.fn() }),
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
  for (const method of ['select', 'eq', 'order', 'insert', 'update', 'upsert']) {
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

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

// total_pot $90, gross, two players
const GAME = {
  id: 'g1',
  round_id: 'r1',
  pot_type: 'total_pot',
  pot_value: 90,
  scoring_type: 'gross',
  participant_ids: ['p1', 'p2'],
  is_team_skins: false,
};

// p1 (3) beats p2 (4) outright → p1 wins, no carryover
const HOLE_SCORES: SkinsHoleScores = {
  p1: { gross: 3, net: 3, strokes_received: 0 },
  p2: { gross: 4, net: 4, strokes_received: 0 },
};

/** Individual path: game `single`, results awaited, round `maybeSingle`,
 *  existing-hole `single` (none), then insert().select().single(). */
function wireIndividual(nineType: string | null) {
  const tables = {
    skins_games: makeTable({ single: [{ data: GAME, error: null }] }),
    skins_results: makeTable({
      awaited: { data: [], error: null },
      single: [
        { data: null, error: null },
        { data: { id: 'res-3', skins_game_id: 'g1' }, error: null },
      ],
    }),
    rounds: makeTable({ maybeSingle: [{ data: { nine_type: nineType }, error: null }] }),
  };
  mockFrom.mockImplementation((name: string) => tables[name as keyof typeof tables]);
  return tables;
}

describe('per-hole skins pricing', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('prices a front-9 total pot at pot / 9 per hole', async () => {
    const tables = wireIndividual('front9');
    const { result } = renderHook(() => useProcessSkinsHole(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ skinsGameId: 'g1', holeNumber: 3, holeScores: HOLE_SCORES });
    });

    expect(tables.rounds.eq).toHaveBeenCalledWith('id', 'r1');
    // $90 / 9 = $10, no carryover in → payout $10
    expect(tables.skins_results.insert).toHaveBeenCalledWith(
      expect.objectContaining({ hole_number: 3, winner_id: 'p1', hole_pot_value: 10, payout_amount: 10 })
    );
  });

  it('keeps pot / 18 for a full round', async () => {
    const tables = wireIndividual('full');
    const { result } = renderHook(() => useProcessSkinsHole(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ skinsGameId: 'g1', holeNumber: 3, holeScores: HOLE_SCORES });
    });

    // $90 / 18 = $5
    expect(tables.skins_results.insert).toHaveBeenCalledWith(
      expect.objectContaining({ hole_pot_value: 5, payout_amount: 5 })
    );
  });

  it('prices team skins on the planned holes too', async () => {
    const teamGame = { ...GAME, is_team_skins: true };
    const tables = {
      skins_games: makeTable({ single: [{ data: teamGame, error: null }] }),
      skins_results: makeTable({
        awaited: { data: [], error: null },
        maybeSingle: [{ data: null, error: null }],
        single: [{ data: { id: 'res-12', skins_game_id: 'g1' }, error: null }],
      }),
      rounds: makeTable({ maybeSingle: [{ data: { nine_type: 'back9' }, error: null }] }),
    };
    mockFrom.mockImplementation((name: string) => tables[name as keyof typeof tables]);
    // scramble uses team_score: t1 3 beats t2 4
    const teamScores: SkinsTeamHoleScores = {
      t1: { team_score: 3, member_scores: {} },
      t2: { team_score: 4, member_scores: {} },
    };
    const { result } = renderHook(() => useProcessTeamSkinsHole(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ skinsGameId: 'g1', holeNumber: 12, teamScores, teamFormat: 'scramble' });
    });

    expect(tables.skins_results.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ hole_number: 12, team_winner_id: 't1', hole_pot_value: 10, payout_amount: 10 }),
      { onConflict: 'skins_game_id,hole_number' }
    );
  });
});
