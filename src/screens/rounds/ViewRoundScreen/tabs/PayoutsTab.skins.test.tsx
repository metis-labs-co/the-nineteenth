/**
 * ViewRound PayoutsTab — a settled skins game shows its stored payouts; an
 * unsettled one previews the settlement on the round's hole counts.
 */
import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { PayoutsTab } from './PayoutsTab';
import type { SkinsGameWithParticipants, SkinsResultWithWinner } from '@/types/database/skins.types';

const mockUseSkinsHoleCounts = jest.fn();
const mockUseSkinsPayouts = jest.fn();
jest.mock('@/hooks/useSkins', () => ({
  useSkinsHoleCounts: (...args: unknown[]) => mockUseSkinsHoleCounts(...args),
  useSkinsPayouts: (...args: unknown[]) => mockUseSkinsPayouts(...args),
}));

// per_hole $5, Ann (p1) and Bob (p2)
const GAME: SkinsGameWithParticipants = {
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
  participants: [
    { id: 'p1', name: 'Ann', handicap: 10 },
    { id: 'p2', name: 'Bob', handicap: 12 },
  ],
};

function won(hole: number, winnerId: string, winnerName: string): SkinsResultWithWinner {
  return {
    id: `res-${hole}`,
    skins_game_id: 'g1',
    hole_number: hole,
    winner_id: winnerId,
    team_winner_id: null,
    is_carryover: false,
    hole_scores: {
      p1: { gross: 4, net: 4, strokes_received: 0 },
      p2: { gross: 4, net: 4, strokes_received: 0 },
    },
    hole_pot_value: 5,
    carryover_to_next: 0,
    payout_amount: 5,
    calculated_at: '2026-10-07T01:00:00Z',
    winner: { id: winnerId, name: winnerName },
  };
}

// Ann wins holes 1–4 ($20), Bob 5–6 ($10).
const SIX_HOLES = [
  won(1, 'p1', 'Ann'),
  won(2, 'p1', 'Ann'),
  won(3, 'p1', 'Ann'),
  won(4, 'p1', 'Ann'),
  won(5, 'p2', 'Bob'),
  won(6, 'p2', 'Bob'),
];

function renderTab(game: SkinsGameWithParticipants) {
  return render(
    <PayoutsTab
      mode="skins-only"
      activeSkinsGame={game}
      skinsResults={SIX_HOLES}
      wolfSummary={null}
      playerNameMap={{ p1: 'Ann', p2: 'Bob' }}
    />
  );
}

describe('PayoutsTab skins', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSkinsPayouts.mockReturnValue({ data: undefined });
  });

  it('previews an 18-hole game at the 18-hole buy-in (unchanged)', () => {
    mockUseSkinsHoleCounts.mockReturnValue({ plannedHoles: 18, holesPlayed: 18 });

    renderTab(GAME);

    expect(mockUseSkinsHoleCounts).toHaveBeenCalledWith('r1');
    expect(screen.getByText('-$25.00')).toBeTruthy(); // Ann 20 - 45
    expect(screen.getByText('-$35.00')).toBeTruthy(); // Bob 10 - 45
  });

  it('previews a round ended after 6 holes over those 6 holes', () => {
    mockUseSkinsHoleCounts.mockReturnValue({ plannedHoles: 18, holesPlayed: 6 });

    renderTab(GAME);

    // buy-in $90 × 6/18 / 2 = $15
    expect(screen.getByText('+$5.00')).toBeTruthy(); // Ann 20 - 15
    expect(screen.getByText('-$5.00')).toBeTruthy(); // Bob 10 - 15
  });

  it('shows the stored payouts of a settled game', () => {
    mockUseSkinsHoleCounts.mockReturnValue({ plannedHoles: 18, holesPlayed: 18 });
    mockUseSkinsPayouts.mockImplementation((gameId?: string) => ({
      data:
        gameId === 'g1'
          ? [
              { player_id: 'p1', buy_in: 45, net_result: 2.5 },
              { player_id: 'p2', buy_in: 45, net_result: -2.5 },
            ]
          : undefined,
    }));

    renderTab({ ...GAME, status: 'completed' });

    expect(mockUseSkinsPayouts).toHaveBeenCalledWith('g1');
    expect(screen.getByText('+$2.50')).toBeTruthy();
    expect(screen.getByText('-$2.50')).toBeTruthy();
  });
});
