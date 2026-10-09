import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wolfKeys } from '@/hooks/queryKeys';
import { useWolfSummary, useWolfStandings } from './queries';

import type {
  WolfDecisionWithDetails,
  WolfGameWithParticipants,
  WolfParticipant,
  WolfPayoutWithPlayer,
} from '@/types/database/wolf.types';

// The real query hooks read cached data; this boundary prevents accidental I/O.
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => {
      throw new Error('Unexpected database access');
    }),
  },
}));

const PLAYERS: WolfParticipant[] = [
  { id: 'p1', name: 'Sam', handicap: 10 },
  { id: 'p2', name: 'Bob', handicap: 12 },
  { id: 'p3', name: 'Ann', handicap: 8 },
];

function game(overrides: Partial<WolfGameWithParticipants> = {}): WolfGameWithParticipants {
  return {
    id: 'w1',
    round_id: 'r1',
    participant_ids: ['p1', 'p2', 'p3'],
    wolf_order: ['p1', 'p2', 'p3'],
    scoring_type: 'gross',
    blind_wolf_enabled: false,
    pot_enabled: false,
    pot_value_per_point: null,
    currency: 'AUD',
    status: 'active',
    disclaimer_accepted_at: null,
    disclaimer_accepted_by: null,
    created_by: 'p1',
    created_at: '2026-10-07T00:00:00Z',
    updated_at: '2026-10-07T00:00:00Z',
    completed_at: null,
    participants: PLAYERS,
    ...overrides,
  };
}

/** A decided decision on `hole` awarding `points` (calculated unless told otherwise). */
function decision(
  hole: number,
  points: Record<string, number>,
  calculated = true
): WolfDecisionWithDetails {
  return {
    id: `d${hole}`,
    wolf_game_id: 'w1',
    hole_number: hole,
    wolf_id: 'p1',
    is_blind_wolf: false,
    partner_id: null,
    hole_scores: null,
    is_tie: false,
    wolf_team_won: true,
    points_awarded: points,
    decided_at: '2026-10-07T00:00:00Z',
    calculated_at: calculated ? '2026-10-07T00:00:00Z' : null,
    wolf: PLAYERS[0],
    partner: null,
  };
}

const PAYOUTS: WolfPayoutWithPlayer[] = [
  {
    id: 'pay1',
    wolf_game_id: 'w1',
    player_id: 'p1',
    total_points: 99,
    total_winnings: 99,
    net_result: 66,
    calculated_at: '2026-10-07T00:00:00Z',
    player: { id: 'p1', name: 'Sam' },
  },
];

function cachedQueries(g: WolfGameWithParticipants | null, decisions: WolfDecisionWithDetails[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  client.setQueryData(wolfKeys.game('w1'), g);
  client.setQueryData(wolfKeys.decisions('w1'), decisions);
  client.setQueryData(wolfKeys.payouts('w1'), PAYOUTS);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('useWolfSummary current behavior (characterization)', () => {
  it('keeps zero-point players, tied ranks, Unknown names, distinct counts and cached references', () => {
    const g = game({
      participants: PLAYERS.slice(0, 2),
      participant_ids: ['p1', 'p2', 'p3', 'p4'],
    });
    const decisions = [
      decision(1, { p1: 4 }),
      decision(2, { p2: 2, p3: 2 }),
      decision(3, {}, false),
      { ...decision(4, {}), decided_at: null },
    ];
    const { wrapper } = cachedQueries(g, decisions);
    const { result } = renderHook(() => useWolfSummary('w1'), { wrapper });
    expect(result.current.data).toEqual({
      game: g,
      decisions,
      payouts: PAYOUTS,
      standings: [
        { player_id: 'p1', name: 'Sam', total_points: 4, rank: 1 },
        { player_id: 'p2', name: 'Bob', total_points: 2, rank: 2 },
        { player_id: 'p3', name: 'Unknown', total_points: 2, rank: 2 },
        { player_id: 'p4', name: 'Unknown', total_points: 0, rank: 4 },
      ],
      holes_completed: 3,
      holes_decided: 3,
    });
    expect(result.current.data?.game).toBe(g);
    expect(result.current.data?.decisions).toBe(decisions);
    expect(result.current.data?.payouts).toBe(PAYOUTS);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it.each([false, true])(
    'omits net_result when pot_enabled=%s and point value is zero',
    (enabled) => {
      const { wrapper } = cachedQueries(game({ pot_enabled: enabled, pot_value_per_point: 0 }), []);
      const { result } = renderHook(() => useWolfSummary('w1'), { wrapper });
      expect(result.current.data?.standings).toEqual([
        { player_id: 'p1', name: 'Sam', total_points: 0, rank: 1 },
        { player_id: 'p2', name: 'Bob', total_points: 0, rank: 1 },
        { player_id: 'p3', name: 'Ann', total_points: 0, rank: 1 },
      ]);
    }
  );

  it('calculates zero-sum net results without replacing stored payouts', () => {
    const { wrapper } = cachedQueries(game({ pot_enabled: true, pot_value_per_point: 1 }), [
      decision(1, { p1: 4, p2: 1, p3: 1 }),
    ]);
    const { result } = renderHook(() => useWolfSummary('w1'), { wrapper });
    expect(result.current.data?.standings.map((e) => [e.player_id, e.net_result])).toEqual([
      ['p1', 2],
      ['p2', -1],
      ['p3', -1],
    ]);
    expect(result.current.data?.payouts).toBe(PAYOUTS);
    expect(result.current.data?.payouts[0].net_result).toBe(66);
  });

  it('returns no summary when the cached game is absent', () => {
    const { wrapper } = cachedQueries(null, []);
    const { result } = renderHook(() => useWolfSummary('w1'), { wrapper });
    expect(result.current.data).toBeNull();
  });

  it('keeps useWolfStandings uncut over all cached decisions', () => {
    const { wrapper } = cachedQueries(game(), [decision(10, { p1: 2 }), decision(16, { p2: 9 })]);
    const { result } = renderHook(() => useWolfStandings('w1'), { wrapper });
    expect(result.current.data?.map((e) => [e.player_id, e.total_points, e.rank])).toEqual([
      ['p2', 9, 1],
      ['p1', 2, 2],
      ['p3', 0, 3],
    ]);
  });
});

describe('useWolfSummary last played hole', () => {
  it('updates on cutoff-only rerenders while preserving the uncut cache and standings', () => {
    const g = game({ pot_enabled: true, pot_value_per_point: 1 });
    const decisions = [decision(10, { p1: 2 }), decision(15, { p3: 2 }), decision(16, { p2: 9 })];
    const original = JSON.parse(JSON.stringify(decisions));
    const { client, wrapper } = cachedQueries(g, decisions);
    const { result, rerender } = renderHook(
      ({ cutoff }: { cutoff: number | null | undefined }) => ({
        summary: useWolfSummary('w1', { lastHoleNumber: cutoff }),
        standings: useWolfStandings('w1'),
      }),
      { wrapper, initialProps: { cutoff: null as number | null | undefined } }
    );
    const cachedDecisions = client.getQueryData(wolfKeys.decisions('w1'));
    expect(result.current.summary.data?.decisions).toBe(decisions);
    rerender({ cutoff: 15 });
    expect(result.current.summary.data?.decisions.map((d) => d.hole_number)).toEqual([10, 15]);
    expect(
      result.current.summary.data?.standings.map((e) => [e.player_id, e.total_points, e.rank])
    ).toEqual([
      ['p1', 2, 1],
      ['p3', 2, 1],
      ['p2', 0, 3],
    ]);
    expect(result.current.summary.data?.holes_completed).toBe(2);
    expect(result.current.summary.data?.holes_decided).toBe(2);
    expect(result.current.summary.data?.payouts).toBe(PAYOUTS);
    expect(result.current.standings.data?.map((e) => [e.player_id, e.total_points])).toEqual([
      ['p2', 9],
      ['p1', 2],
      ['p3', 2],
    ]);
    rerender({ cutoff: 10 });
    expect(result.current.summary.data?.decisions.map((d) => d.hole_number)).toEqual([10]);
    expect(result.current.summary.data?.holes_completed).toBe(1);
    rerender({ cutoff: undefined });
    expect(result.current.summary.data?.decisions).toBe(decisions);
    expect(result.current.summary.data?.holes_completed).toBe(3);
    expect(client.getQueryData(wolfKeys.decisions('w1'))).toBe(cachedDecisions);
    expect(decisions).toEqual(original);
  });
});
