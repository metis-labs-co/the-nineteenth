/**
 * Skins Calculation Utilities Tests
 *
 * Tests for all skins gambling feature calculations including:
 * - Pot value calculations (per-hole and total pot)
 * - Buy-in calculations
 * - Score preparation and winner determination
 * - Carryover logic
 * - Hole 18 split calculations
 * - Final payout calculations
 * - Debt simplification
 * - Validation functions
 */

import {
  calculateHoleValue,
  calculateTotalPot,
  calculateBuyIn,
  prepareHoleScores,
  determineHoleWinner,
  calculateCurrentCarryover,
  processHoleResult,
  calculateHole18Split,
  calculateFinalPayouts,
  calculateFinalPayoutsWithCarryover,
  validateSkinsGame,
  validateHoleScores,
  calculateNetPositions,
  simplifyDebts,
  formatDebtTransactions,
  isSkinsGameComplete,
  getNextHoleNumber,
  type SkinsParticipantInfo,
  type SkinsScorecardData,
} from '@/utils/skinsCalculations';
import type {
  SkinsHoleScores,
  SkinsResult,
  SkinsGame,
  SkinsPayout,
  SkinsNetPosition,
} from '@/types/database';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create mock hole scores for testing
 */
function createMockHoleScores(
  scores: { playerId: string; gross: number; net: number; strokes_received: number }[]
): SkinsHoleScores {
  const holeScores: SkinsHoleScores = {};
  for (const score of scores) {
    holeScores[score.playerId] = {
      gross: score.gross,
      net: score.net,
      strokes_received: score.strokes_received,
    };
  }
  return holeScores;
}

/**
 * Create mock skins results for testing
 */
function createMockResults(
  resultsData: {
    hole_number: number;
    winner_id: string | null;
    is_carryover: boolean;
    payout_amount: number;
    carryover_to_next: number;
    hole_scores: SkinsHoleScores;
  }[]
): Pick<SkinsResult, 'hole_number' | 'winner_id' | 'is_carryover' | 'payout_amount' | 'carryover_to_next' | 'hole_scores'>[] {
  return resultsData;
}

/**
 * Create mock skins game for testing
 */
function createMockGame(
  overrides: Partial<Pick<SkinsGame, 'pot_type' | 'pot_value' | 'participant_ids'>> = {}
): Pick<SkinsGame, 'pot_type' | 'pot_value' | 'participant_ids'> {
  return {
    pot_type: 'per_hole',
    pot_value: 5,
    participant_ids: ['p1', 'p2', 'p3', 'p4'],
    ...overrides,
  };
}

// ============================================================================
// Pot Calculation Tests
// ============================================================================

describe('Pot Calculation Functions', () => {
  describe('calculateHoleValue', () => {
    it('returns exact value for per_hole pot type', () => {
      expect(calculateHoleValue('per_hole', 5)).toBe(5);
      expect(calculateHoleValue('per_hole', 10)).toBe(10);
      expect(calculateHoleValue('per_hole', 2.5)).toBe(2.5);
    });

    it('divides by 18 for total_pot type', () => {
      expect(calculateHoleValue('total_pot', 90)).toBe(5); // 90 / 18 = 5
      expect(calculateHoleValue('total_pot', 180)).toBe(10); // 180 / 18 = 10
      expect(calculateHoleValue('total_pot', 100)).toBe(5.56); // 100 / 18 ≈ 5.56
    });

    it('rounds to 2 decimal places', () => {
      expect(calculateHoleValue('total_pot', 100)).toBe(5.56); // 100/18 = 5.555...
      expect(calculateHoleValue('total_pot', 50)).toBe(2.78); // 50/18 = 2.777...
    });

    it('handles zero value', () => {
      expect(calculateHoleValue('per_hole', 0)).toBe(0);
      expect(calculateHoleValue('total_pot', 0)).toBe(0);
    });
  });

  describe('calculateTotalPot', () => {
    it('multiplies by 18 for per_hole type', () => {
      expect(calculateTotalPot('per_hole', 5)).toBe(90); // 5 * 18 = 90
      expect(calculateTotalPot('per_hole', 10)).toBe(180); // 10 * 18 = 180
    });

    it('returns exact value for total_pot type', () => {
      expect(calculateTotalPot('total_pot', 90)).toBe(90);
      expect(calculateTotalPot('total_pot', 100)).toBe(100);
    });

    it('handles decimal values', () => {
      expect(calculateTotalPot('per_hole', 2.5)).toBe(45); // 2.5 * 18 = 45
      expect(calculateTotalPot('per_hole', 5.5)).toBe(99); // 5.5 * 18 = 99
    });

    it('handles zero value', () => {
      expect(calculateTotalPot('per_hole', 0)).toBe(0);
      expect(calculateTotalPot('total_pot', 0)).toBe(0);
    });
  });

  describe('calculateBuyIn', () => {
    it('calculates correct buy-in for 4 players with per_hole', () => {
      // $5/hole * 18 holes = $90 total / 4 players = $22.50 each
      expect(calculateBuyIn('per_hole', 5, 4)).toBe(22.5);
    });

    it('calculates correct buy-in for 4 players with total_pot', () => {
      // $100 total / 4 players = $25 each
      expect(calculateBuyIn('total_pot', 100, 4)).toBe(25);
    });

    it('calculates correct buy-in for 2 players', () => {
      // $5/hole * 18 holes = $90 total / 2 players = $45 each
      expect(calculateBuyIn('per_hole', 5, 2)).toBe(45);
    });

    it('calculates correct buy-in for 3 players', () => {
      // $5/hole * 18 holes = $90 total / 3 players = $30 each
      expect(calculateBuyIn('per_hole', 5, 3)).toBe(30);
    });

    it('rounds to 2 decimal places', () => {
      // $100 total / 3 players = $33.333... → $33.33
      expect(calculateBuyIn('total_pot', 100, 3)).toBe(33.33);
    });

    it('handles odd divisions', () => {
      // $10/hole * 18 = $180 / 7 players = $25.714... → $25.71
      expect(calculateBuyIn('per_hole', 10, 7)).toBe(25.71);
    });
  });
});

// ============================================================================
// Score Preparation Tests
// ============================================================================

describe('Score Preparation Functions', () => {
  describe('prepareHoleScores', () => {
    const participants: SkinsParticipantInfo[] = [
      { id: 'p1', handicap: 18 },
      { id: 'p2', handicap: 10 },
      { id: 'p3', handicap: 0 },
    ];

    const scorecards: Record<string, SkinsScorecardData> = {
      p1: { '1': { strokes: 5 }, '2': { strokes: 4 } },
      p2: { '1': { strokes: 4 }, '2': { strokes: 5 } },
      p3: { '1': { strokes: 4 }, '2': { strokes: 4 } },
    };

    const hole1 = { par: 4 as const, strokeIndex: 5 };
    const hole2 = { par: 4 as const, strokeIndex: 15 };

    it('calculates gross, net, and strokes_received for each player', () => {
      const result = prepareHoleScores(participants, scorecards, hole1, 1);

      // p1: handicap 18, SI 5 -> gets 1 stroke, gross 5, net 4
      expect(result['p1'].gross).toBe(5);
      expect(result['p1'].strokes_received).toBe(1);
      expect(result['p1'].net).toBe(4);

      // p2: handicap 10, SI 5 -> gets 1 stroke, gross 4, net 3
      expect(result['p2'].gross).toBe(4);
      expect(result['p2'].strokes_received).toBe(1);
      expect(result['p2'].net).toBe(3);

      // p3: handicap 0, SI 5 -> gets 0 strokes, gross 4, net 4
      expect(result['p3'].gross).toBe(4);
      expect(result['p3'].strokes_received).toBe(0);
      expect(result['p3'].net).toBe(4);
    });

    it('handles different hole stroke indexes', () => {
      const result = prepareHoleScores(participants, scorecards, hole2, 2);

      // Hole 2, SI 15
      // p1: handicap 18, SI 15 -> gets 1 stroke
      expect(result['p1'].strokes_received).toBe(1);
      // p2: handicap 10, SI 15 > 10 -> gets 0 strokes
      expect(result['p2'].strokes_received).toBe(0);
      // p3: handicap 0 -> gets 0 strokes
      expect(result['p3'].strokes_received).toBe(0);
    });

    it('handles missing scorecard data', () => {
      const partialScorecards: Record<string, SkinsScorecardData> = {
        p1: { '1': { strokes: 5 } },
        // p2 and p3 missing
      };

      const result = prepareHoleScores(participants, partialScorecards, hole1, 1);

      expect(Object.keys(result)).toHaveLength(1);
      expect(result['p1']).toBeDefined();
      expect(result['p2']).toBeUndefined();
      expect(result['p3']).toBeUndefined();
    });

    it('handles null handicap (defaults to 0)', () => {
      const participantsWithNull: SkinsParticipantInfo[] = [
        { id: 'p1', handicap: null },
      ];
      const scorecards: Record<string, SkinsScorecardData> = {
        p1: { '1': { strokes: 5 } },
      };

      const result = prepareHoleScores(participantsWithNull, scorecards, hole1, 1);

      expect(result['p1'].strokes_received).toBe(0);
      expect(result['p1'].net).toBe(5); // gross = net when no strokes received
    });

    it('handles numeric score format', () => {
      const numericScorecards: Record<string, SkinsScorecardData> = {
        p1: { '1': 5 }, // Just a number instead of { strokes: 5 }
      };

      const result = prepareHoleScores(
        [{ id: 'p1', handicap: 0 }],
        numericScorecards,
        hole1,
        1
      );

      expect(result['p1'].gross).toBe(5);
    });
  });
});

// ============================================================================
// Winner Determination Tests
// ============================================================================

describe('Winner Determination Functions', () => {
  describe('determineHoleWinner', () => {
    it('identifies single winner with gross scoring', () => {
      const holeScores = createMockHoleScores([
        { playerId: 'p1', gross: 4, net: 3, strokes_received: 1 },
        { playerId: 'p2', gross: 5, net: 4, strokes_received: 1 },
        { playerId: 'p3', gross: 6, net: 5, strokes_received: 1 },
      ]);

      const result = determineHoleWinner(holeScores, 'gross');

      expect(result.winnerId).toBe('p1');
      expect(result.isCarryover).toBe(false);
      expect(result.minScore).toBe(4);
      expect(result.tiedPlayerIds).toEqual(['p1']);
    });

    it('identifies single winner with net scoring', () => {
      const holeScores = createMockHoleScores([
        { playerId: 'p1', gross: 5, net: 3, strokes_received: 2 },
        { playerId: 'p2', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p3', gross: 5, net: 4, strokes_received: 1 },
      ]);

      const result = determineHoleWinner(holeScores, 'net');

      expect(result.winnerId).toBe('p1');
      expect(result.isCarryover).toBe(false);
      expect(result.minScore).toBe(3);
      expect(result.tiedPlayerIds).toEqual(['p1']);
    });

    it('detects tie (carryover) with 2 players', () => {
      const holeScores = createMockHoleScores([
        { playerId: 'p1', gross: 4, net: 3, strokes_received: 1 },
        { playerId: 'p2', gross: 4, net: 3, strokes_received: 1 },
      ]);

      const result = determineHoleWinner(holeScores, 'gross');

      expect(result.winnerId).toBeNull();
      expect(result.isCarryover).toBe(true);
      expect(result.minScore).toBe(4);
      expect(result.tiedPlayerIds).toEqual(['p1', 'p2']);
    });

    it('detects tie (carryover) with 3 players', () => {
      const holeScores = createMockHoleScores([
        { playerId: 'p1', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p2', gross: 5, net: 4, strokes_received: 1 },
        { playerId: 'p3', gross: 5, net: 4, strokes_received: 1 },
      ]);

      const result = determineHoleWinner(holeScores, 'net');

      expect(result.winnerId).toBeNull();
      expect(result.isCarryover).toBe(true);
      expect(result.minScore).toBe(4);
      expect(result.tiedPlayerIds).toHaveLength(3);
    });

    it('detects all-tied hole (4 players)', () => {
      const holeScores = createMockHoleScores([
        { playerId: 'p1', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p2', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p3', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p4', gross: 4, net: 4, strokes_received: 0 },
      ]);

      const result = determineHoleWinner(holeScores, 'gross');

      expect(result.winnerId).toBeNull();
      expect(result.isCarryover).toBe(true);
      expect(result.tiedPlayerIds).toHaveLength(4);
    });

    it('handles empty scores', () => {
      const result = determineHoleWinner({}, 'gross');

      expect(result.winnerId).toBeNull();
      expect(result.isCarryover).toBe(true);
      expect(result.minScore).toBe(0);
      expect(result.tiedPlayerIds).toHaveLength(0);
    });

    it('handles single player (always wins)', () => {
      const holeScores = createMockHoleScores([
        { playerId: 'p1', gross: 4, net: 3, strokes_received: 1 },
      ]);

      const result = determineHoleWinner(holeScores, 'gross');

      expect(result.winnerId).toBe('p1');
      expect(result.isCarryover).toBe(false);
    });
  });
});

// ============================================================================
// Carryover Calculation Tests
// ============================================================================

describe('Carryover Calculation Functions', () => {
  describe('calculateCurrentCarryover', () => {
    it('returns 0 for empty results', () => {
      expect(calculateCurrentCarryover([])).toBe(0);
    });

    it('returns carryover from last hole', () => {
      const results = [
        { hole_number: 1, carryover_to_next: 5 },
        { hole_number: 2, carryover_to_next: 10 },
        { hole_number: 3, carryover_to_next: 0 },
      ];

      expect(calculateCurrentCarryover(results)).toBe(0);
    });

    it('handles unsorted results', () => {
      const results = [
        { hole_number: 2, carryover_to_next: 10 },
        { hole_number: 1, carryover_to_next: 5 },
        { hole_number: 3, carryover_to_next: 15 },
      ];

      expect(calculateCurrentCarryover(results)).toBe(15);
    });

    it('returns accumulated carryover', () => {
      const results = [
        { hole_number: 1, carryover_to_next: 5 },
        { hole_number: 2, carryover_to_next: 10 },
        { hole_number: 3, carryover_to_next: 15 }, // 3 consecutive ties
      ];

      expect(calculateCurrentCarryover(results)).toBe(15);
    });

    it('returns 0 after a win', () => {
      const results = [
        { hole_number: 1, carryover_to_next: 5 },
        { hole_number: 2, carryover_to_next: 0 }, // Someone won
      ];

      expect(calculateCurrentCarryover(results)).toBe(0);
    });
  });
});

// ============================================================================
// Hole Result Processing Tests
// ============================================================================

describe('Hole Result Processing', () => {
  describe('processHoleResult', () => {
    const baseHoleScores = createMockHoleScores([
      { playerId: 'p1', gross: 4, net: 3, strokes_received: 1 },
      { playerId: 'p2', gross: 5, net: 4, strokes_received: 1 },
    ]);

    const tiedHoleScores = createMockHoleScores([
      { playerId: 'p1', gross: 4, net: 3, strokes_received: 1 },
      { playerId: 'p2', gross: 4, net: 3, strokes_received: 1 },
    ]);

    it('creates winner result with payout', () => {
      const result = processHoleResult(1, baseHoleScores, 5, 0, 'gross');

      expect(result.hole_number).toBe(1);
      expect(result.winner_id).toBe('p1');
      expect(result.is_carryover).toBe(false);
      expect(result.hole_pot_value).toBe(5);
      expect(result.carryover_to_next).toBe(0);
      expect(result.payout_amount).toBe(5);
    });

    it('creates carryover result for tie', () => {
      const result = processHoleResult(1, tiedHoleScores, 5, 0, 'gross');

      expect(result.winner_id).toBeNull();
      expect(result.is_carryover).toBe(true);
      expect(result.hole_pot_value).toBe(5);
      expect(result.carryover_to_next).toBe(5);
      expect(result.payout_amount).toBe(0);
    });

    it('includes carryover in payout', () => {
      const result = processHoleResult(3, baseHoleScores, 5, 10, 'gross');

      // $5 base + $10 carryover = $15 payout
      expect(result.payout_amount).toBe(15);
      expect(result.carryover_to_next).toBe(0);
    });

    it('accumulates carryover on consecutive ties', () => {
      const result = processHoleResult(3, tiedHoleScores, 5, 10, 'gross');

      // $5 base + $10 carryover = $15 carried to next
      expect(result.payout_amount).toBe(0);
      expect(result.carryover_to_next).toBe(15);
    });

    it('uses net scoring when specified', () => {
      const netScores = createMockHoleScores([
        { playerId: 'p1', gross: 5, net: 3, strokes_received: 2 },
        { playerId: 'p2', gross: 4, net: 4, strokes_received: 0 },
      ]);

      const result = processHoleResult(1, netScores, 5, 0, 'net');

      // p1 wins with net 3 vs p2's net 4
      expect(result.winner_id).toBe('p1');
    });
  });
});

// ============================================================================
// Hole 18 Split Tests
// ============================================================================

describe('Hole 18 Split', () => {
  describe('calculateHole18Split', () => {
    it('splits evenly among 4 players', () => {
      expect(calculateHole18Split(20, 4)).toBe(5);
    });

    it('splits evenly among 2 players', () => {
      expect(calculateHole18Split(30, 2)).toBe(15);
    });

    it('splits evenly among 3 players', () => {
      expect(calculateHole18Split(30, 3)).toBe(10);
    });

    it('rounds to 2 decimal places', () => {
      // $10 / 3 = $3.333... → $3.33
      expect(calculateHole18Split(10, 3)).toBe(3.33);
    });

    it('handles large carryover', () => {
      // $100 / 4 = $25
      expect(calculateHole18Split(100, 4)).toBe(25);
    });

    it('handles zero carryover', () => {
      expect(calculateHole18Split(0, 4)).toBe(0);
    });
  });
});

// ============================================================================
// Final Payout Calculation Tests
// ============================================================================

describe('Final Payout Calculations', () => {
  describe('calculateFinalPayouts', () => {
    const game = createMockGame();
    const participants = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }];

    it('calculates payouts for a simple game', () => {
      const holeScores = createMockHoleScores([
        { playerId: 'p1', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p2', gross: 5, net: 5, strokes_received: 0 },
        { playerId: 'p3', gross: 5, net: 5, strokes_received: 0 },
        { playerId: 'p4', gross: 5, net: 5, strokes_received: 0 },
      ]);

      // p1 wins 1 hole ($5)
      const results = createMockResults([
        {
          hole_number: 1,
          winner_id: 'p1',
          is_carryover: false,
          payout_amount: 5,
          carryover_to_next: 0,
          hole_scores: holeScores,
        },
      ]);

      const payouts = calculateFinalPayouts(game, results, participants);

      expect(payouts).toHaveLength(4);

      const p1Payout = payouts.find((p) => p.player_id === 'p1')!;
      expect(p1Payout.holes_won).toBe(1);
      expect(p1Payout.total_winnings).toBe(5);
      expect(p1Payout.buy_in).toBe(22.5); // $90 / 4

      const p2Payout = payouts.find((p) => p.player_id === 'p2')!;
      expect(p2Payout.holes_lost).toBe(1);
      expect(p2Payout.total_winnings).toBe(0);
    });

    it('calculates net_result correctly', () => {
      const holeScores = createMockHoleScores([
        { playerId: 'p1', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p2', gross: 5, net: 5, strokes_received: 0 },
        { playerId: 'p3', gross: 5, net: 5, strokes_received: 0 },
        { playerId: 'p4', gross: 5, net: 5, strokes_received: 0 },
      ]);

      // p1 wins $45 total
      const results = createMockResults(
        Array.from({ length: 9 }, (_, i) => ({
          hole_number: i + 1,
          winner_id: 'p1',
          is_carryover: false,
          payout_amount: 5,
          carryover_to_next: 0,
          hole_scores: holeScores,
        }))
      );

      const payouts = calculateFinalPayouts(game, results, participants);

      const p1Payout = payouts.find((p) => p.player_id === 'p1')!;
      expect(p1Payout.total_winnings).toBe(45);
      expect(p1Payout.buy_in).toBe(22.5);
      expect(p1Payout.net_result).toBe(22.5); // 45 - 22.5

      const p2Payout = payouts.find((p) => p.player_id === 'p2')!;
      expect(p2Payout.total_winnings).toBe(0);
      expect(p2Payout.net_result).toBe(-22.5); // 0 - 22.5
    });

    it('tracks tied holes correctly', () => {
      const tiedScores = createMockHoleScores([
        { playerId: 'p1', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p2', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p3', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p4', gross: 4, net: 4, strokes_received: 0 },
      ]);

      const results = createMockResults([
        {
          hole_number: 1,
          winner_id: null,
          is_carryover: true,
          payout_amount: 0,
          carryover_to_next: 5,
          hole_scores: tiedScores,
        },
      ]);

      const payouts = calculateFinalPayouts(game, results, participants);

      for (const payout of payouts) {
        expect(payout.holes_tied).toBe(1);
        expect(payout.holes_won).toBe(0);
        expect(payout.holes_lost).toBe(0);
      }
    });

    it('handles multiple winners across holes', () => {
      const p1WinsScores = createMockHoleScores([
        { playerId: 'p1', gross: 3, net: 3, strokes_received: 0 },
        { playerId: 'p2', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p3', gross: 5, net: 5, strokes_received: 0 },
        { playerId: 'p4', gross: 5, net: 5, strokes_received: 0 },
      ]);

      const p2WinsScores = createMockHoleScores([
        { playerId: 'p1', gross: 5, net: 5, strokes_received: 0 },
        { playerId: 'p2', gross: 3, net: 3, strokes_received: 0 },
        { playerId: 'p3', gross: 5, net: 5, strokes_received: 0 },
        { playerId: 'p4', gross: 5, net: 5, strokes_received: 0 },
      ]);

      const results = createMockResults([
        {
          hole_number: 1,
          winner_id: 'p1',
          is_carryover: false,
          payout_amount: 5,
          carryover_to_next: 0,
          hole_scores: p1WinsScores,
        },
        {
          hole_number: 2,
          winner_id: 'p2',
          is_carryover: false,
          payout_amount: 5,
          carryover_to_next: 0,
          hole_scores: p2WinsScores,
        },
      ]);

      const payouts = calculateFinalPayouts(game, results, participants);

      const p1Payout = payouts.find((p) => p.player_id === 'p1')!;
      expect(p1Payout.holes_won).toBe(1);
      expect(p1Payout.holes_lost).toBe(1);
      expect(p1Payout.total_winnings).toBe(5);

      const p2Payout = payouts.find((p) => p.player_id === 'p2')!;
      expect(p2Payout.holes_won).toBe(1);
      expect(p2Payout.holes_lost).toBe(1);
      expect(p2Payout.total_winnings).toBe(5);
    });

    it('handles winner with carryover (winning 2 holes worth)', () => {
      const tiedScores = createMockHoleScores([
        { playerId: 'p1', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p2', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p3', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p4', gross: 4, net: 4, strokes_received: 0 },
      ]);

      const p1WinsScores = createMockHoleScores([
        { playerId: 'p1', gross: 3, net: 3, strokes_received: 0 },
        { playerId: 'p2', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p3', gross: 5, net: 5, strokes_received: 0 },
        { playerId: 'p4', gross: 5, net: 5, strokes_received: 0 },
      ]);

      const results = createMockResults([
        {
          hole_number: 1,
          winner_id: null,
          is_carryover: true,
          payout_amount: 0,
          carryover_to_next: 5,
          hole_scores: tiedScores,
        },
        {
          hole_number: 2,
          winner_id: 'p1',
          is_carryover: false,
          payout_amount: 10, // $5 + $5 carryover
          carryover_to_next: 0,
          hole_scores: p1WinsScores,
        },
      ]);

      const payouts = calculateFinalPayouts(game, results, participants);

      const p1Payout = payouts.find((p) => p.player_id === 'p1')!;
      expect(p1Payout.total_winnings).toBe(10);
      expect(p1Payout.holes_won).toBe(1);
      expect(p1Payout.holes_tied).toBe(1);
    });
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe('Validation Functions', () => {
  describe('validateSkinsGame', () => {
    it('validates valid 2-player game', () => {
      const result = validateSkinsGame(['p1', 'p2'], 5);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates valid 4-player game', () => {
      const result = validateSkinsGame(['p1', 'p2', 'p3', 'p4'], 10);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects single player', () => {
      const result = validateSkinsGame(['p1'], 5);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least 2 participants required');
    });

    it('accepts more than 4 players', () => {
      const result = validateSkinsGame(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'], 5);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects zero pot value', () => {
      const result = validateSkinsGame(['p1', 'p2'], 0);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pot value must be greater than 0');
    });

    it('rejects negative pot value', () => {
      const result = validateSkinsGame(['p1', 'p2'], -5);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pot value must be greater than 0');
    });

    it('accepts large pot values', () => {
      const result = validateSkinsGame(['p1', 'p2'], 500);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects duplicate participants', () => {
      const result = validateSkinsGame(['p1', 'p1', 'p2'], 5);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate participants not allowed');
    });

    it('returns multiple errors when applicable', () => {
      const result = validateSkinsGame(['p1'], 0);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('validateHoleScores', () => {
    it('validates complete scores', () => {
      const holeScores = createMockHoleScores([
        { playerId: 'p1', gross: 4, net: 3, strokes_received: 1 },
        { playerId: 'p2', gross: 5, net: 4, strokes_received: 1 },
      ]);

      const result = validateHoleScores(holeScores, ['p1', 'p2']);

      expect(result.isValid).toBe(true);
      expect(result.missingPlayerIds).toHaveLength(0);
    });

    it('identifies missing players', () => {
      const holeScores = createMockHoleScores([
        { playerId: 'p1', gross: 4, net: 3, strokes_received: 1 },
      ]);

      const result = validateHoleScores(holeScores, ['p1', 'p2', 'p3']);

      expect(result.isValid).toBe(false);
      expect(result.missingPlayerIds).toEqual(['p2', 'p3']);
    });

    it('handles empty scores', () => {
      const result = validateHoleScores({}, ['p1', 'p2']);

      expect(result.isValid).toBe(false);
      expect(result.missingPlayerIds).toEqual(['p1', 'p2']);
    });

    it('handles extra players in scores', () => {
      const holeScores = createMockHoleScores([
        { playerId: 'p1', gross: 4, net: 3, strokes_received: 1 },
        { playerId: 'p2', gross: 5, net: 4, strokes_received: 1 },
        { playerId: 'p3', gross: 5, net: 4, strokes_received: 1 },
      ]);

      // Only checking for p1 and p2
      const result = validateHoleScores(holeScores, ['p1', 'p2']);

      expect(result.isValid).toBe(true);
    });
  });
});

// ============================================================================
// Debt Calculation Tests
// ============================================================================

describe('Debt Calculation Functions', () => {
  describe('calculateNetPositions', () => {
    it('calculates net positions from payouts', () => {
      const payouts: Pick<SkinsPayout, 'player_id' | 'net_result'>[] = [
        { player_id: 'p1', net_result: 22.5 },
        { player_id: 'p2', net_result: 2.5 },
        { player_id: 'p3', net_result: -12.5 },
        { player_id: 'p4', net_result: -12.5 },
      ];

      const positions = calculateNetPositions(payouts);

      expect(positions).toHaveLength(4);
      // Should be sorted by net_amount descending (creditors first)
      expect(positions[0].player_id).toBe('p1');
      expect(positions[0].net_amount).toBe(22.5);
      expect(positions[3].net_amount).toBe(-12.5);
    });

    it('handles all even payouts', () => {
      const payouts: Pick<SkinsPayout, 'player_id' | 'net_result'>[] = [
        { player_id: 'p1', net_result: 0 },
        { player_id: 'p2', net_result: 0 },
        { player_id: 'p3', net_result: 0 },
        { player_id: 'p4', net_result: 0 },
      ];

      const positions = calculateNetPositions(payouts);

      expect(positions.every((p) => p.net_amount === 0)).toBe(true);
    });
  });

  describe('simplifyDebts', () => {
    it('simplifies 2-player debt', () => {
      const positions: SkinsNetPosition[] = [
        { player_id: 'p1', net_amount: 10 },
        { player_id: 'p2', net_amount: -10 },
      ];

      const transactions = simplifyDebts(positions);

      expect(transactions).toHaveLength(1);
      expect(transactions[0].from_player_id).toBe('p2');
      expect(transactions[0].to_player_id).toBe('p1');
      expect(transactions[0].amount).toBe(10);
    });

    it('simplifies 4-player debts', () => {
      const positions: SkinsNetPosition[] = [
        { player_id: 'p1', net_amount: 22.5 },
        { player_id: 'p2', net_amount: 2.5 },
        { player_id: 'p3', net_amount: -12.5 },
        { player_id: 'p4', net_amount: -12.5 },
      ];

      const transactions = simplifyDebts(positions);

      // Total debt should equal total credit
      const totalPaid = transactions.reduce((sum, t) => sum + t.amount, 0);
      expect(totalPaid).toBeCloseTo(25, 2); // Total owed = 12.5 + 12.5 = 25
    });

    it('handles all even positions (no transactions)', () => {
      const positions: SkinsNetPosition[] = [
        { player_id: 'p1', net_amount: 0 },
        { player_id: 'p2', net_amount: 0 },
        { player_id: 'p3', net_amount: 0 },
        { player_id: 'p4', net_amount: 0 },
      ];

      const transactions = simplifyDebts(positions);

      expect(transactions).toHaveLength(0);
    });

    it('minimizes number of transactions', () => {
      // Classic debt simplification scenario
      // Without simplification: p3 owes p1, p4 owes p1, p4 owes p2 (3 transactions)
      // With simplification: fewer transactions needed
      const positions: SkinsNetPosition[] = [
        { player_id: 'p1', net_amount: 22.5 },
        { player_id: 'p2', net_amount: 2.5 },
        { player_id: 'p3', net_amount: -12.5 },
        { player_id: 'p4', net_amount: -12.5 },
      ];

      const transactions = simplifyDebts(positions);

      // Should be at most 3 transactions (n-1 where n=4)
      expect(transactions.length).toBeLessThanOrEqual(3);
    });

    it('skips tiny amounts (< $0.01)', () => {
      const positions: SkinsNetPosition[] = [
        { player_id: 'p1', net_amount: 10 },
        { player_id: 'p2', net_amount: 0.005 }, // Tiny credit
        { player_id: 'p3', net_amount: -10.005 }, // Slightly over
      ];

      const transactions = simplifyDebts(positions);

      // Should create one main transaction, potentially skipping the tiny amount
      const totalPaid = transactions.reduce((sum, t) => sum + t.amount, 0);
      expect(totalPaid).toBeCloseTo(10, 1);
    });
  });

  describe('formatDebtTransactions', () => {
    it('formats transactions with player names', () => {
      const transactions = [
        { from_player_id: 'p1', to_player_id: 'p2', amount: 12.5 },
      ];
      const playerMap = { p1: 'John', p2: 'Sarah' };

      const formatted = formatDebtTransactions(transactions, playerMap);

      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toBe('John owes Sarah: $12.50');
    });

    it('handles unknown players', () => {
      const transactions = [
        { from_player_id: 'p1', to_player_id: 'p2', amount: 10 },
      ];
      const playerMap = { p1: 'John' };

      const formatted = formatDebtTransactions(transactions, playerMap);

      expect(formatted[0]).toBe('John owes Unknown: $10.00');
    });

    it('formats multiple transactions', () => {
      const transactions = [
        { from_player_id: 'p1', to_player_id: 'p2', amount: 12.5 },
        { from_player_id: 'p3', to_player_id: 'p2', amount: 7.5 },
      ];
      const playerMap = { p1: 'John', p2: 'Sarah', p3: 'Mike' };

      const formatted = formatDebtTransactions(transactions, playerMap);

      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toBe('John owes Sarah: $12.50');
      expect(formatted[1]).toBe('Mike owes Sarah: $7.50');
    });

    it('handles empty transactions', () => {
      const formatted = formatDebtTransactions([], {});
      expect(formatted).toHaveLength(0);
    });
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Utility Functions', () => {
  describe('isSkinsGameComplete', () => {
    it('returns true when all 18 holes have results', () => {
      const results = Array.from({ length: 18 }, (_, i) => ({
        hole_number: i + 1,
      }));

      expect(isSkinsGameComplete(results)).toBe(true);
    });

    it('returns false when fewer than 18 holes', () => {
      const results = Array.from({ length: 9 }, (_, i) => ({
        hole_number: i + 1,
      }));

      expect(isSkinsGameComplete(results)).toBe(false);
    });

    it('returns true when more than 18 results (edge case)', () => {
      const results = Array.from({ length: 20 }, (_, i) => ({
        hole_number: i + 1,
      }));

      expect(isSkinsGameComplete(results)).toBe(true);
    });

    it('returns false for empty results', () => {
      expect(isSkinsGameComplete([])).toBe(false);
    });
  });

  describe('getNextHoleNumber', () => {
    it('returns 1 for empty results', () => {
      expect(getNextHoleNumber([])).toBe(1);
    });

    it('returns next sequential hole', () => {
      const results = [{ hole_number: 1 }, { hole_number: 2 }, { hole_number: 3 }];
      expect(getNextHoleNumber(results)).toBe(4);
    });

    it('returns null when all 18 holes complete', () => {
      const results = Array.from({ length: 18 }, (_, i) => ({
        hole_number: i + 1,
      }));

      expect(getNextHoleNumber(results)).toBeNull();
    });

    it('handles non-sequential results', () => {
      const results = [{ hole_number: 1 }, { hole_number: 3 }];
      // Should return the first missing hole
      expect(getNextHoleNumber(results)).toBe(2);
    });

    it('handles results starting mid-round', () => {
      const results = [{ hole_number: 5 }, { hole_number: 6 }];
      // Should return hole 1 since that's the first missing
      expect(getNextHoleNumber(results)).toBe(1);
    });
  });
});

// ============================================================================
// Integration/Scenario Tests
// ============================================================================

describe('Skins Game Scenarios', () => {
  describe('Complete 4-player game scenario', () => {
    it('simulates a realistic skins game outcome', () => {
      const game = createMockGame();
      const participants = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }];

      // Simulate 18 holes with various outcomes
      const results: Pick<SkinsResult, 'hole_number' | 'winner_id' | 'is_carryover' | 'payout_amount' | 'carryover_to_next' | 'hole_scores'>[] = [];

      const baseScores = createMockHoleScores([
        { playerId: 'p1', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p2', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p3', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p4', gross: 4, net: 4, strokes_received: 0 },
      ]);

      // Holes 1-2: Tied (carryover $10)
      results.push({
        hole_number: 1,
        winner_id: null,
        is_carryover: true,
        payout_amount: 0,
        carryover_to_next: 5,
        hole_scores: baseScores,
      });
      results.push({
        hole_number: 2,
        winner_id: null,
        is_carryover: true,
        payout_amount: 0,
        carryover_to_next: 10,
        hole_scores: baseScores,
      });

      // Hole 3: p1 wins ($15 = $5 + $10 carryover)
      results.push({
        hole_number: 3,
        winner_id: 'p1',
        is_carryover: false,
        payout_amount: 15,
        carryover_to_next: 0,
        hole_scores: baseScores,
      });

      // Holes 4-17: All won by various players (simplified)
      for (let i = 4; i <= 17; i++) {
        const winner = `p${((i - 1) % 4) + 1}`;
        results.push({
          hole_number: i,
          winner_id: winner,
          is_carryover: false,
          payout_amount: 5,
          carryover_to_next: 0,
          hole_scores: baseScores,
        });
      }

      // Hole 18: Tied (remaining pot splits)
      results.push({
        hole_number: 18,
        winner_id: null,
        is_carryover: true,
        payout_amount: 0,
        carryover_to_next: 5,
        hole_scores: baseScores,
      });

      const payouts = calculateFinalPayouts(game, results, participants);

      // With hole 18 carryover split:
      // - Holes 1-2 tied ($10 carryover)
      // - Hole 3 won by p1 ($15 = $5 + $10 carryover)
      // - Holes 4-17 won ($70 total)
      // - Hole 18 tied ($5 carryover, split among 4 players = $1.25 each)
      // Total explicitly won = $15 + $70 = $85
      // Plus $5 split = $90 total distributed
      const totalWinnings = payouts.reduce((sum, p) => sum + p.total_winnings, 0);
      expect(totalWinnings).toBe(90); // Full pot distributed (including hole 18 split)

      // Net results should sum to 0 (zero-sum game, all money distributed)
      const netSum = payouts.reduce((sum, p) => sum + p.net_result, 0);
      expect(netSum).toBeCloseTo(0, 2);
    });
  });

  describe('All-tied game scenario', () => {
    it('handles a game where every hole is tied', () => {
      const game = createMockGame();
      const participants = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }];

      const tiedScores = createMockHoleScores([
        { playerId: 'p1', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p2', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p3', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p4', gross: 4, net: 4, strokes_received: 0 },
      ]);

      // All 18 holes tied
      const results = Array.from({ length: 18 }, (_, i) => ({
        hole_number: i + 1,
        winner_id: null as string | null,
        is_carryover: true,
        payout_amount: 0,
        carryover_to_next: (i + 1) * 5, // Accumulating carryover
        hole_scores: tiedScores,
      }));

      const payouts = calculateFinalPayouts(game, results, participants);

      // With hole 18 carryover split for direct pot games:
      // All $90 is split evenly among 4 players = $22.50 each
      const _buyIn = calculateBuyIn('per_hole', 5, 4); // $22.50
      const splitAmount = 90 / 4; // $22.50

      expect(payouts.every((p) => p.total_winnings === splitAmount)).toBe(true);
      expect(payouts.every((p) => p.holes_won === 0)).toBe(true);
      expect(payouts.every((p) => p.holes_tied === 18)).toBe(true);

      // Everyone breaks even (winnings equal buy-in)
      expect(payouts.every((p) => p.net_result === 0)).toBe(true);
    });
  });

  describe('Single winner takes all scenario', () => {
    it('handles a game where one player wins every hole', () => {
      const game = createMockGame();
      const participants = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }];

      const p1WinsScores = createMockHoleScores([
        { playerId: 'p1', gross: 3, net: 3, strokes_received: 0 },
        { playerId: 'p2', gross: 5, net: 5, strokes_received: 0 },
        { playerId: 'p3', gross: 5, net: 5, strokes_received: 0 },
        { playerId: 'p4', gross: 5, net: 5, strokes_received: 0 },
      ]);

      // p1 wins all 18 holes
      const results = Array.from({ length: 18 }, (_, i) => ({
        hole_number: i + 1,
        winner_id: 'p1',
        is_carryover: false,
        payout_amount: 5,
        carryover_to_next: 0,
        hole_scores: p1WinsScores,
      }));

      const payouts = calculateFinalPayouts(game, results, participants);

      const p1Payout = payouts.find((p) => p.player_id === 'p1')!;
      expect(p1Payout.total_winnings).toBe(90); // All 18 holes * $5
      expect(p1Payout.holes_won).toBe(18);
      expect(p1Payout.net_result).toBe(90 - 22.5); // Won everything minus buy-in

      // All others lost everything
      const losers = payouts.filter((p) => p.player_id !== 'p1');
      expect(losers.every((p) => p.total_winnings === 0)).toBe(true);
      expect(losers.every((p) => p.holes_lost === 18)).toBe(true);
      expect(losers.every((p) => p.net_result === -22.5)).toBe(true);
    });
  });

  describe('Pool-sourced game carryover handling', () => {
    it('splits hole 18 carryover for direct pot games', () => {
      const game = createMockGame();
      const participants = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }];

      const tiedScores = createMockHoleScores([
        { playerId: 'p1', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p2', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p3', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p4', gross: 4, net: 4, strokes_received: 0 },
      ]);

      // All 18 holes tied - $90 total carryover at end
      const results = Array.from({ length: 18 }, (_, i) => ({
        hole_number: i + 1,
        winner_id: null as string | null,
        is_carryover: true,
        payout_amount: 0,
        carryover_to_next: (i + 1) * 5, // Accumulating carryover
        hole_scores: tiedScores,
      }));

      // Direct pot game - carryover should be split
      const result = calculateFinalPayoutsWithCarryover(game, results, participants);

      // Carryover was split
      expect(result.hole18CarryoverSplit).toBe(true);
      expect(result.remainingCarryover).toBe(0);

      // Each player gets $90/4 = $22.50 from the split
      const expectedSplit = 22.5; // $90 / 4 players
      for (const payout of result.payouts) {
        expect(payout.total_winnings).toBe(expectedSplit);
        // Net result: $22.50 winnings - $22.50 buy-in = $0
        expect(payout.net_result).toBe(0);
      }
    });

    it('does NOT split carryover for pool-sourced games', () => {
      const game = createMockGame();
      const participants = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }];

      const tiedScores = createMockHoleScores([
        { playerId: 'p1', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p2', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p3', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p4', gross: 4, net: 4, strokes_received: 0 },
      ]);

      // All 18 holes tied - $90 total carryover at end
      const results = Array.from({ length: 18 }, (_, i) => ({
        hole_number: i + 1,
        winner_id: null as string | null,
        is_carryover: true,
        payout_amount: 0,
        carryover_to_next: (i + 1) * 5, // Accumulating carryover
        hole_scores: tiedScores,
      }));

      // Pool-sourced game - carryover should NOT be split, returns to pool
      const result = calculateFinalPayoutsWithCarryover(game, results, participants, {
        poolSourced: true,
      });

      // Carryover was NOT split
      expect(result.hole18CarryoverSplit).toBe(false);
      expect(result.remainingCarryover).toBe(90); // Full pot returns to pool

      // No one gets any winnings
      for (const payout of result.payouts) {
        expect(payout.total_winnings).toBe(0);
        // Net result: $0 winnings - $22.50 buy-in = -$22.50
        expect(payout.net_result).toBe(-22.5);
      }
    });

    it('returns partial carryover for pool-sourced game with some winners', () => {
      const game = createMockGame();
      const participants = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }];

      const p1WinsScores = createMockHoleScores([
        { playerId: 'p1', gross: 3, net: 3, strokes_received: 0 },
        { playerId: 'p2', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p3', gross: 5, net: 5, strokes_received: 0 },
        { playerId: 'p4', gross: 5, net: 5, strokes_received: 0 },
      ]);

      const tiedScores = createMockHoleScores([
        { playerId: 'p1', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p2', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p3', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p4', gross: 4, net: 4, strokes_received: 0 },
      ]);

      // Holes 1-9: p1 wins ($45 total)
      // Holes 10-17: tied (carryover building)
      // Hole 18: tied ($45 carryover)
      const results = [
        // Holes 1-9: p1 wins each
        ...Array.from({ length: 9 }, (_, i) => ({
          hole_number: i + 1,
          winner_id: 'p1',
          is_carryover: false,
          payout_amount: 5,
          carryover_to_next: 0,
          hole_scores: p1WinsScores,
        })),
        // Holes 10-18: all tied (9 holes tied = $45 carryover)
        ...Array.from({ length: 9 }, (_, i) => ({
          hole_number: i + 10,
          winner_id: null as string | null,
          is_carryover: true,
          payout_amount: 0,
          carryover_to_next: (i + 1) * 5, // $5, $10, $15, ... $45
          hole_scores: tiedScores,
        })),
      ];

      // Pool-sourced game
      const result = calculateFinalPayoutsWithCarryover(game, results, participants, {
        poolSourced: true,
      });

      // Carryover was NOT split
      expect(result.hole18CarryoverSplit).toBe(false);
      expect(result.remainingCarryover).toBe(45); // Half pot returns to pool

      const p1Payout = result.payouts.find((p) => p.player_id === 'p1')!;
      expect(p1Payout.total_winnings).toBe(45); // Won 9 holes * $5
      expect(p1Payout.holes_won).toBe(9);
      expect(p1Payout.holes_tied).toBe(9);
      expect(p1Payout.net_result).toBe(45 - 22.5); // $22.50 profit

      // Others won nothing
      const losers = result.payouts.filter((p) => p.player_id !== 'p1');
      expect(losers.every((p) => p.total_winnings === 0)).toBe(true);
      expect(losers.every((p) => p.net_result === -22.5)).toBe(true);
    });

    it('returns zero carryover when hole 18 is won', () => {
      const game = createMockGame();
      const participants = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }];

      const p1WinsScores = createMockHoleScores([
        { playerId: 'p1', gross: 3, net: 3, strokes_received: 0 },
        { playerId: 'p2', gross: 4, net: 4, strokes_received: 0 },
        { playerId: 'p3', gross: 5, net: 5, strokes_received: 0 },
        { playerId: 'p4', gross: 5, net: 5, strokes_received: 0 },
      ]);

      // All 18 holes won by p1
      const results = Array.from({ length: 18 }, (_, i) => ({
        hole_number: i + 1,
        winner_id: 'p1',
        is_carryover: false,
        payout_amount: 5,
        carryover_to_next: 0,
        hole_scores: p1WinsScores,
      }));

      // Pool-sourced game - but no carryover anyway
      const result = calculateFinalPayoutsWithCarryover(game, results, participants, {
        poolSourced: true,
      });

      expect(result.hole18CarryoverSplit).toBe(false);
      expect(result.remainingCarryover).toBe(0); // Nothing to return

      const p1Payout = result.payouts.find((p) => p.player_id === 'p1')!;
      expect(p1Payout.total_winnings).toBe(90);
    });
  });
});
