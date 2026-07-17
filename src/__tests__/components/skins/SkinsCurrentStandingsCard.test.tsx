/**
 * SkinsCurrentStandingsCard Component Tests
 *
 * Tests for the live in-progress skins standings card:
 * - Renders per-player current payouts (winnings minus buy-in)
 * - Sorted best-to-worst
 * - Pending carryover reported, not distributed
 * - 9-hole buy-in pricing
 *
 * @see src/components/skins/SkinsCurrentStandingsCard/index.tsx
 */

import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { SkinsCurrentStandingsCard } from '@/components/skins/SkinsCurrentStandingsCard';
import type { SkinsGameWithParticipants, SkinsResult } from '@/types/database';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createMockGame = (
  overrides: Partial<SkinsGameWithParticipants> = {}
): SkinsGameWithParticipants => ({
  id: 'game-1',
  round_id: 'round-1',
  pairing_id: null,
  sub_match_id: null,
  participant_ids: ['player-1', 'player-2'],
  pot_type: 'per_hole',
  pot_value: 5,
  currency: 'AUD',
  scoring_type: 'net',
  status: 'active',
  disclaimer_accepted_at: new Date().toISOString(),
  disclaimer_accepted_by: 'player-1',
  created_by: 'player-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  completed_at: null,
  is_team_skins: false,
  participant_team_ids: null,
  participants: [
    { id: 'player-1', name: 'Sam', handicap: 8.3 },
    { id: 'player-2', name: 'Ben', handicap: 10.7 },
  ],
  ...overrides,
});

type ResultInput = Pick<
  SkinsResult,
  'hole_number' | 'winner_id' | 'is_carryover' | 'payout_amount' | 'carryover_to_next' | 'hole_scores'
>;

const holeScores = {
  'player-1': { gross: 4, net: 4, strokes_received: 0 },
  'player-2': { gross: 5, net: 5, strokes_received: 0 },
};

const winResult = (hole: number, winnerId: string, amount: number): ResultInput => ({
  hole_number: hole,
  winner_id: winnerId,
  is_carryover: false,
  payout_amount: amount,
  carryover_to_next: 0,
  hole_scores: holeScores,
});

const tieResult = (hole: number, carryover: number): ResultInput => ({
  hole_number: hole,
  winner_id: null,
  is_carryover: true,
  payout_amount: 0,
  carryover_to_next: carryover,
  hole_scores: holeScores,
});

// ============================================================================
// TEST SUITE
// ============================================================================

describe('SkinsCurrentStandingsCard', () => {
  it('renders without crashing', () => {
    render(
      <SkinsCurrentStandingsCard
        game={createMockGame()}
        results={[winResult(1, 'player-1', 5)]}
        totalHoles={18}
        holesCompleted={1}
        testID="standings-card"
      />
    );

    expect(screen.getByTestId('standings-card')).toBeTruthy();
  });

  it('shows each player with their current net payout', () => {
    // Sam wins $60 across 5 holes, Ben wins $35 — buy-in is $45 each
    render(
      <SkinsCurrentStandingsCard
        game={createMockGame()}
        results={[winResult(1, 'player-1', 60), winResult(2, 'player-2', 35)]}
        totalHoles={18}
        holesCompleted={2}
      />
    );

    expect(screen.getByText('Sam')).toBeTruthy();
    expect(screen.getByText('Ben')).toBeTruthy();
    // Net = winnings - $45 buy-in
    expect(screen.getByText('+$15.00')).toBeTruthy(); // Sam: 60 - 45
    expect(screen.getByText('-$10.00')).toBeTruthy(); // Ben: 35 - 45
  });

  it('reports pending carryover without banking it to anyone', () => {
    render(
      <SkinsCurrentStandingsCard
        game={createMockGame()}
        results={[tieResult(1, 5), tieResult(2, 10)]}
        totalHoles={18}
        holesCompleted={2}
      />
    );

    expect(screen.getByText(/\$10\.00 carryover still to be won/)).toBeTruthy();
    // Both players show only their buy-in as net (nothing banked)
    expect(screen.getAllByText('-$45.00')).toHaveLength(2);
  });

  it('shows holes-completed progress', () => {
    render(
      <SkinsCurrentStandingsCard
        game={createMockGame()}
        results={[winResult(1, 'player-1', 5)]}
        totalHoles={18}
        holesCompleted={12}
      />
    );

    expect(screen.getByText(/12 of 18 holes completed/)).toBeTruthy();
  });

  it('prices the buy-in off the round length for 9-hole rounds', () => {
    render(
      <SkinsCurrentStandingsCard
        game={createMockGame()}
        results={[]}
        totalHoles={9}
        holesCompleted={0}
      />
    );

    // $5 × 9 holes / 2 players = $22.50
    expect(screen.getByText(/Buy-in \$22\.50 per player/)).toBeTruthy();
  });
});
