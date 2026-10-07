/**
 * buildSkinsSummary — the summary behind useSkinsSummary (indicator popover,
 * Review skins/payouts tabs). Holes priced on the planned count; the pot is
 * the stored buy-ins once settled, else the pot for the holes played.
 */
import { buildSkinsSummary } from '@/hooks/skins/queries';
import type {
  SkinsGameWithParticipants,
  SkinsPayoutWithPlayer,
  SkinsResultWithWinner,
} from '@/types/database/skins.types';

const game = (overrides: Partial<SkinsGameWithParticipants> = {}): SkinsGameWithParticipants => ({
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
  ...overrides,
});

const result = (hole: number, winnerId: string | null, payout: number, carry: number): SkinsResultWithWinner => ({
  id: `res-${hole}`,
  skins_game_id: 'g1',
  hole_number: hole,
  winner_id: winnerId,
  team_winner_id: null,
  is_carryover: winnerId === null,
  hole_scores: {},
  hole_pot_value: 5,
  carryover_to_next: carry,
  payout_amount: payout,
  calculated_at: '2026-10-07T01:00:00Z',
  winner: winnerId ? { id: winnerId, name: winnerId } : null,
});

const payout = (playerId: string, buyIn: number, net: number): SkinsPayoutWithPlayer => ({
  id: `pay-${playerId}`,
  skins_game_id: 'g1',
  player_id: playerId,
  team_id: null,
  is_team_payout: false,
  buy_in: buyIn,
  total_winnings: buyIn + net,
  net_result: net,
  holes_won: 0,
  holes_tied: 0,
  holes_lost: 0,
  calculated_at: '2026-10-07T03:00:00Z',
  player: { id: playerId, name: playerId },
});

describe('buildSkinsSummary', () => {
  it('keeps the 18-hole pricing when no hole counts are given', () => {
    const summary = buildSkinsSummary(game(), [result(1, 'p1', 5, 0), result(2, null, 0, 5)], []);

    expect(summary.per_hole_value).toBe(5);
    expect(summary.total_pot).toBe(90); // $5 × 18
    expect(summary.current_carryover).toBe(5); // hole 2 tied
    expect(summary.holes_completed).toBe(2);
  });

  it('prices a front nine on 9 holes', () => {
    const summary = buildSkinsSummary(game(), [], [], { plannedHoles: 9, holesPlayed: 9 });

    expect(summary.per_hole_value).toBe(5);
    expect(summary.total_pot).toBe(45); // $5 × 9
  });

  it('prices holes on the plan and the pot on the holes played after an early end', () => {
    const summary = buildSkinsSummary(
      game({ pot_type: 'total_pot', pot_value: 90 }),
      [],
      [],
      { plannedHoles: 9, holesPlayed: 6 }
    );

    expect(summary.per_hole_value).toBe(10); // $90 / 9
    expect(summary.total_pot).toBe(60); // $90 × 6/9
  });

  it('shows the stored buy-ins once the game is settled', () => {
    const summary = buildSkinsSummary(
      game({ status: 'completed' }),
      [],
      [payout('p1', 22.5, 2.5), payout('p2', 22.5, -2.5)]
    );

    expect(summary.total_pot).toBe(45); // 22.5 + 22.5, not the 18-hole $90
  });

  it('falls back to the played pot for a completed game with no payouts yet', () => {
    const summary = buildSkinsSummary(game({ status: 'completed' }), [], [], {
      plannedHoles: 18,
      holesPlayed: 6,
    });

    expect(summary.total_pot).toBe(30); // $90 × 6/18
  });
});
