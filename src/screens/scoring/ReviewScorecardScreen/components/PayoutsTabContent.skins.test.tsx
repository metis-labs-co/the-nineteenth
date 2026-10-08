/**
 * Review PayoutsTabContent — a completed skins game shows its stored payouts,
 * not payouts re-derived from the results.
 */
import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { PayoutsTabContent } from './PayoutsTabContent';

const mockUseSkinsSummary = jest.fn();
jest.mock('@/hooks/useSkins', () => ({
  useSkinsSummary: (...args: unknown[]) => mockUseSkinsSummary(...args),
}));
jest.mock('@/hooks/wolf', () => ({
  useWolfSummary: () => ({ data: undefined, isLoading: false, refetch: jest.fn() }),
}));

const scores = {
  p1: { gross: 4, net: 4, strokes_received: 0 },
  p2: { gross: 4, net: 4, strokes_received: 0 },
};

// per_hole $5, front nine: Ann (p1) wins holes 1–5 ($25), Bob (p2) holes 6–9 ($20).
// Re-derived it would read -$20.00 / -$25.00 at 18 holes, or +$2.50 / -$2.50 at 9.
const RESULTS = Array.from({ length: 9 }, (_, i) => ({
  id: `res-${i + 1}`,
  skins_game_id: 'g1',
  hole_number: i + 1,
  winner_id: i < 5 ? 'p1' : 'p2',
  team_winner_id: null,
  is_carryover: false,
  hole_scores: scores,
  hole_pot_value: 5,
  carryover_to_next: 0,
  payout_amount: 5,
  calculated_at: '2026-10-07T01:00:00Z',
  winner: null,
}));

// Stored settlement values that no re-derivation produces, so the test can only
// pass if the stored rows are what renders.
const STORED = [
  { id: 'pay-1', skins_game_id: 'g1', player_id: 'p1', team_id: null, is_team_payout: false, buy_in: 22.5, total_winnings: 30, net_result: 7.5, holes_won: 5, holes_tied: 0, holes_lost: 4, calculated_at: '2026-10-07T03:00:00Z', player: { id: 'p1', name: 'Ann' } },
  { id: 'pay-2', skins_game_id: 'g1', player_id: 'p2', team_id: null, is_team_payout: false, buy_in: 22.5, total_winnings: 15, net_result: -7.5, holes_won: 4, holes_tied: 0, holes_lost: 5, calculated_at: '2026-10-07T03:00:00Z', player: { id: 'p2', name: 'Bob' } },
];

describe('Review PayoutsTabContent skins', () => {
  it('renders the stored payouts of a completed game', () => {
    mockUseSkinsSummary.mockReturnValue({
      data: {
        game: {
          id: 'g1',
          round_id: 'r1',
          status: 'completed',
          pot_type: 'per_hole',
          pot_value: 5,
          scoring_type: 'gross',
          is_team_skins: false,
          participant_ids: ['p1', 'p2'],
          participants: [
            { id: 'p1', name: 'Ann', handicap: 10 },
            { id: 'p2', name: 'Bob', handicap: 12 },
          ],
        },
        results: RESULTS,
        payouts: STORED,
        current_carryover: 0,
        holes_completed: 9,
        total_pot: 45,
        per_hole_value: 5,
      },
      isLoading: false,
      refetch: jest.fn(),
    });

    render(
      <PayoutsTabContent
        mode="skins-only"
        skinsGameId="g1"
        holeCounts={{ plannedHoles: 9, holesPlayed: 9 }}
        isRefreshing={false}
        onRefresh={jest.fn()}
        bottomInset={0}
      />
    );

    expect(mockUseSkinsSummary).toHaveBeenCalledWith('g1', { plannedHoles: 9, holesPlayed: 9 });
    expect(screen.getByText('+$7.50')).toBeTruthy(); // Ann, stored
    expect(screen.getByText('-$7.50')).toBeTruthy(); // Bob, stored
    expect(screen.queryByText('+$2.50')).toBeNull();
    expect(screen.queryByText('-$20.00')).toBeNull();
  });
});
