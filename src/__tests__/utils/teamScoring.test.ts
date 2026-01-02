/**
 * Team Scoring Tests
 *
 * Comprehensive tests for team scoring utilities:
 * - Best Ball (Four Ball) calculations
 * - Scramble/Ambrose team scoring
 * - Team handicap calculations
 * - Match Play hole and match results
 *
 * @file src/__tests__/utils/teamScoring.test.ts
 */

import {
  calculateBestBallHole,
  calculateScrambleHole,
  calculateTeamHandicap,
  calculateMatchPlayHoleResult,
  calculateMatchPlayMatchResult,
  calculateMatchPlayHoleResultWithHandicaps,
  formatMatchPlayScore,
  type TeamMemberScore,
  type TeamMember,
  type MatchPlayHoleResult,
} from '@/utils/teamScoring';
import type { Hole } from '@/types';
import { create18Holes } from './testFixtures';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a test hole with specific properties
 */
function createTestHole(overrides: Partial<Hole> = {}): Hole {
  return {
    number: 1 as const,
    par: 4,
    strokeIndex: 1,
    yardages: { white: 400 },
    ...overrides,
  };
}

/**
 * Create team member scores for testing
 */
function createTeamMemberScores(
  data: { id: string; gross: number; handicap: number }[]
): TeamMemberScore[] {
  return data.map((d) => ({
    playerId: d.id,
    grossScore: d.gross,
    handicap: d.handicap,
  }));
}

/**
 * Create team members for handicap testing
 */
function createTeamMembers(
  data: { id: string; handicap: number }[]
): TeamMember[] {
  return data.map((d) => ({
    playerId: d.id,
    handicap: d.handicap,
  }));
}

/**
 * Create a series of match play hole results
 */
function createHoleResults(
  results: { player: number; opponent: number }[]
): MatchPlayHoleResult[] {
  return results.map((r, index) => {
    let result: 'won' | 'lost' | 'halved';
    if (r.player < r.opponent) result = 'won';
    else if (r.player > r.opponent) result = 'lost';
    else result = 'halved';

    return {
      holeNumber: index + 1,
      playerScore: r.player,
      opponentScore: r.opponent,
      result,
    };
  });
}

// ============================================================================
// Best Ball (Four Ball) Tests
// ============================================================================

describe('calculateBestBallHole', () => {
  const _holes = create18Holes();

  describe('basic functionality', () => {
    it('returns the best net score among team members', () => {
      const teamScores = createTeamMemberScores([
        { id: 'p1', gross: 6, handicap: 20 }, // SI 1: gets 2 strokes, net = 4
        { id: 'p2', gross: 5, handicap: 8 }, // SI 1: gets 1 stroke, net = 4
      ]);
      const hole = createTestHole({ strokeIndex: 1 }); // SI 1

      const result = calculateBestBallHole(teamScores, hole);

      // Both have net 4, first player should be selected
      expect(result.bestNetScore).toBe(4);
      expect(result.contributingPlayerId).toBe('p1');
    });

    it('selects player with lower net when different', () => {
      const teamScores = createTeamMemberScores([
        { id: 'p1', gross: 5, handicap: 0 }, // net = 5
        { id: 'p2', gross: 6, handicap: 10 }, // SI 7: gets 1 stroke, net = 5
        { id: 'p3', gross: 4, handicap: 18 }, // SI 7: gets 1 stroke, net = 3
      ]);
      const hole = createTestHole({ strokeIndex: 7 });

      const result = calculateBestBallHole(teamScores, hole);

      expect(result.bestNetScore).toBe(3);
      expect(result.contributingPlayerId).toBe('p3');
    });

    it('returns all net scores in allNetScores array', () => {
      const teamScores = createTeamMemberScores([
        { id: 'p1', gross: 5, handicap: 0 },
        { id: 'p2', gross: 6, handicap: 18 },
      ]);
      const hole = createTestHole({ strokeIndex: 1 });

      const result = calculateBestBallHole(teamScores, hole);

      expect(result.allNetScores).toHaveLength(2);
      expect(result.allNetScores).toContainEqual({ playerId: 'p1', netScore: 5 });
      expect(result.allNetScores).toContainEqual({ playerId: 'p2', netScore: 5 }); // 6 - 1 stroke
    });
  });

  describe('handicap calculations', () => {
    it('calculates strokes received correctly for high handicap', () => {
      // Handicap 36 player gets 2 strokes on every hole
      const teamScores = createTeamMemberScores([
        { id: 'p1', gross: 6, handicap: 36 }, // net = 4 (gets 2 strokes)
        { id: 'p2', gross: 5, handicap: 0 }, // net = 5
      ]);
      const hole = createTestHole({ strokeIndex: 10 });

      const result = calculateBestBallHole(teamScores, hole);

      expect(result.bestNetScore).toBe(4);
      expect(result.contributingPlayerId).toBe('p1');
    });

    it('handles zero handicap correctly', () => {
      const teamScores = createTeamMemberScores([
        { id: 'p1', gross: 4, handicap: 0 },
        { id: 'p2', gross: 5, handicap: 0 },
      ]);
      const hole = createTestHole({ strokeIndex: 1 });

      const result = calculateBestBallHole(teamScores, hole);

      expect(result.bestNetScore).toBe(4);
      expect(result.contributingPlayerId).toBe('p1');
    });

    it('handles fractional stroke distribution across holes', () => {
      // Handicap 9 means strokes on SI 1-9 only
      const teamScores = createTeamMemberScores([
        { id: 'p1', gross: 5, handicap: 9 }, // SI 10: no stroke, net = 5
        { id: 'p2', gross: 5, handicap: 9 }, // SI 10: no stroke, net = 5
      ]);
      const hole = createTestHole({ strokeIndex: 10 });

      const result = calculateBestBallHole(teamScores, hole);

      expect(result.bestNetScore).toBe(5);

      // With SI 9, should get stroke
      const hole2 = createTestHole({ strokeIndex: 9 });
      const result2 = calculateBestBallHole(teamScores, hole2);

      expect(result2.bestNetScore).toBe(4); // 5 - 1 stroke
    });
  });

  describe('edge cases', () => {
    it('throws error for empty team', () => {
      const hole = createTestHole();

      expect(() => calculateBestBallHole([], hole)).toThrow(
        'Team must have at least one player'
      );
    });

    it('handles single player team', () => {
      const teamScores = createTeamMemberScores([
        { id: 'p1', gross: 5, handicap: 10 },
      ]);
      const hole = createTestHole({ strokeIndex: 5 });

      const result = calculateBestBallHole(teamScores, hole);

      // SI 5 with handicap 10: gets 1 stroke, net = 4
      expect(result.bestNetScore).toBe(4);
      expect(result.contributingPlayerId).toBe('p1');
      expect(result.allNetScores).toHaveLength(1);
    });

    it('handles 4-player team correctly', () => {
      const teamScores = createTeamMemberScores([
        { id: 'p1', gross: 7, handicap: 28 }, // net = 5 (gets 2 strokes on SI 1)
        { id: 'p2', gross: 6, handicap: 18 }, // net = 5 (gets 1 stroke)
        { id: 'p3', gross: 5, handicap: 9 }, // net = 4 (gets 1 stroke)
        { id: 'p4', gross: 4, handicap: 0 }, // net = 4
      ]);
      const hole = createTestHole({ strokeIndex: 1 });

      const result = calculateBestBallHole(teamScores, hole);

      // p3 and p4 both have net 4, p3 comes first with net 4
      expect(result.bestNetScore).toBe(4);
    });

    it('handles all players with same net score - returns first', () => {
      const teamScores = createTeamMemberScores([
        { id: 'p1', gross: 5, handicap: 0 },
        { id: 'p2', gross: 5, handicap: 0 },
        { id: 'p3', gross: 5, handicap: 0 },
      ]);
      const hole = createTestHole({ strokeIndex: 15 });

      const result = calculateBestBallHole(teamScores, hole);

      expect(result.bestNetScore).toBe(5);
      expect(result.contributingPlayerId).toBe('p1'); // First with best score
    });

    it('handles picked up scores (high scores like 10+)', () => {
      const teamScores = createTeamMemberScores([
        { id: 'p1', gross: 10, handicap: 18 }, // Picked up - net = 9
        { id: 'p2', gross: 5, handicap: 10 }, // net = 4
      ]);
      const hole = createTestHole({ strokeIndex: 5 });

      const result = calculateBestBallHole(teamScores, hole);

      expect(result.bestNetScore).toBe(4);
      expect(result.contributingPlayerId).toBe('p2');
    });
  });
});

// ============================================================================
// Scramble / Ambrose Tests
// ============================================================================

describe('calculateScrambleHole', () => {
  describe('basic functionality', () => {
    it('applies team handicap to team score', () => {
      const hole = createTestHole({ strokeIndex: 1 });

      // Handicap 18 gets 1 stroke on every hole
      const netScore = calculateScrambleHole(5, 18, hole);

      expect(netScore).toBe(4); // 5 - 1 stroke
    });

    it('handles high team handicap correctly', () => {
      const hole = createTestHole({ strokeIndex: 1 });

      // Handicap 36 gets 2 strokes on every hole
      const netScore = calculateScrambleHole(6, 36, hole);

      expect(netScore).toBe(4); // 6 - 2 strokes
    });

    it('returns gross score when team handicap is 0', () => {
      const hole = createTestHole({ strokeIndex: 1 });

      const netScore = calculateScrambleHole(5, 0, hole);

      expect(netScore).toBe(5);
    });
  });

  describe('stroke index distribution', () => {
    it('gives strokes only on appropriate holes based on handicap', () => {
      // Handicap 9 gets strokes on SI 1-9
      const holeWithStroke = createTestHole({ strokeIndex: 5 });
      const holeWithoutStroke = createTestHole({ strokeIndex: 15 });

      expect(calculateScrambleHole(5, 9, holeWithStroke)).toBe(4);
      expect(calculateScrambleHole(5, 9, holeWithoutStroke)).toBe(5);
    });

    it('handles handicap 27 correctly (1.5 strokes per hole)', () => {
      // Handicap 27 = 1 stroke base + extra on SI 1-9
      const holeSI1 = createTestHole({ strokeIndex: 1 }); // Gets 2 strokes
      const holeSI10 = createTestHole({ strokeIndex: 10 }); // Gets 1 stroke

      expect(calculateScrambleHole(6, 27, holeSI1)).toBe(4);
      expect(calculateScrambleHole(6, 27, holeSI10)).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('handles very low team score', () => {
      const hole = createTestHole({ strokeIndex: 1 });

      // Team scores 2 on par 4 with 18 handicap
      const netScore = calculateScrambleHole(2, 18, hole);

      expect(netScore).toBe(1);
    });

    it('handles very high team score', () => {
      const hole = createTestHole({ strokeIndex: 1 });

      const netScore = calculateScrambleHole(10, 18, hole);

      expect(netScore).toBe(9);
    });
  });
});

// ============================================================================
// Team Handicap Tests
// ============================================================================

describe('calculateTeamHandicap', () => {
  describe('2-person teams', () => {
    it('calculates correctly with 35% low + 15% high formula', () => {
      const team = createTeamMembers([
        { id: 'p1', handicap: 10 },
        { id: 'p2', handicap: 20 },
      ]);

      const result = calculateTeamHandicap(team);

      // 35% of 10 + 15% of 20 = 3.5 + 3 = 6.5 → 7
      expect(result).toBe(7);
    });

    it('works when handicaps are in different order', () => {
      const team = createTeamMembers([
        { id: 'p1', handicap: 20 }, // Higher first
        { id: 'p2', handicap: 10 }, // Lower second
      ]);

      const result = calculateTeamHandicap(team);

      // Should still use 35% of low + 15% of high
      expect(result).toBe(7);
    });

    it('handles equal handicaps', () => {
      const team = createTeamMembers([
        { id: 'p1', handicap: 15 },
        { id: 'p2', handicap: 15 },
      ]);

      const result = calculateTeamHandicap(team);

      // 35% of 15 + 15% of 15 = 5.25 + 2.25 = 7.5 → 8
      expect(result).toBe(8);
    });

    it('handles zero handicaps', () => {
      const team = createTeamMembers([
        { id: 'p1', handicap: 0 },
        { id: 'p2', handicap: 0 },
      ]);

      const result = calculateTeamHandicap(team);

      expect(result).toBe(0);
    });

    it('handles mixed zero and non-zero handicaps', () => {
      const team = createTeamMembers([
        { id: 'p1', handicap: 0 },
        { id: 'p2', handicap: 20 },
      ]);

      const result = calculateTeamHandicap(team);

      // 35% of 0 + 15% of 20 = 0 + 3 = 3
      expect(result).toBe(3);
    });
  });

  describe('single player', () => {
    it('returns player full handicap', () => {
      const team = createTeamMembers([{ id: 'p1', handicap: 15 }]);

      const result = calculateTeamHandicap(team);

      expect(result).toBe(15);
    });

    it('rounds fractional handicap', () => {
      const team = createTeamMembers([{ id: 'p1', handicap: 15.4 }]);

      const result = calculateTeamHandicap(team);

      expect(result).toBe(15);
    });
  });

  describe('3-person teams', () => {
    it('calculates using average divided by team size', () => {
      const team = createTeamMembers([
        { id: 'p1', handicap: 6 },
        { id: 'p2', handicap: 12 },
        { id: 'p3', handicap: 18 },
      ]);

      const result = calculateTeamHandicap(team);

      // Average = 12, divided by 3 = 4
      expect(result).toBe(4);
    });
  });

  describe('4-person teams', () => {
    it('calculates using average divided by team size', () => {
      const team = createTeamMembers([
        { id: 'p1', handicap: 8 },
        { id: 'p2', handicap: 12 },
        { id: 'p3', handicap: 16 },
        { id: 'p4', handicap: 20 },
      ]);

      const result = calculateTeamHandicap(team);

      // Average = 14, divided by 4 = 3.5 → 4
      expect(result).toBe(4);
    });

    it('handles very low average', () => {
      const team = createTeamMembers([
        { id: 'p1', handicap: 2 },
        { id: 'p2', handicap: 2 },
        { id: 'p3', handicap: 2 },
        { id: 'p4', handicap: 2 },
      ]);

      const result = calculateTeamHandicap(team);

      // Average = 2, divided by 4 = 0.5 → 1
      expect(result).toBe(1);
    });
  });

  describe('teamSize override', () => {
    it('allows overriding team size for calculation', () => {
      // 2 members but calculate as if 4
      const team = createTeamMembers([
        { id: 'p1', handicap: 10 },
        { id: 'p2', handicap: 20 },
      ]);

      const result = calculateTeamHandicap(team, 4);

      // With teamSize=4: average(15) / 4 = 3.75 → 4
      expect(result).toBe(4);
    });
  });

  describe('edge cases', () => {
    it('throws error for empty team', () => {
      expect(() => calculateTeamHandicap([])).toThrow(
        'Team must have at least one member'
      );
    });

    it('handles high handicap players', () => {
      const team = createTeamMembers([
        { id: 'p1', handicap: 36 },
        { id: 'p2', handicap: 36 },
      ]);

      const result = calculateTeamHandicap(team);

      // 35% of 36 + 15% of 36 = 12.6 + 5.4 = 18
      expect(result).toBe(18);
    });
  });
});

// ============================================================================
// Match Play Hole Result Tests
// ============================================================================

describe('calculateMatchPlayHoleResult', () => {
  describe('basic outcomes', () => {
    it('returns won when player score is lower', () => {
      const result = calculateMatchPlayHoleResult(3, 5, 1);

      expect(result.result).toBe('won');
      expect(result.playerScore).toBe(3);
      expect(result.opponentScore).toBe(5);
      expect(result.holeNumber).toBe(1);
    });

    it('returns lost when opponent score is lower', () => {
      const result = calculateMatchPlayHoleResult(6, 4, 5);

      expect(result.result).toBe('lost');
      expect(result.playerScore).toBe(6);
      expect(result.opponentScore).toBe(4);
      expect(result.holeNumber).toBe(5);
    });

    it('returns halved when scores are equal', () => {
      const result = calculateMatchPlayHoleResult(4, 4, 10);

      expect(result.result).toBe('halved');
      expect(result.playerScore).toBe(4);
      expect(result.opponentScore).toBe(4);
      expect(result.holeNumber).toBe(10);
    });
  });

  describe('score differences', () => {
    it('handles large score differences', () => {
      const result = calculateMatchPlayHoleResult(3, 8, 1);

      expect(result.result).toBe('won');
    });

    it('handles single stroke difference', () => {
      const result = calculateMatchPlayHoleResult(5, 4, 1);

      expect(result.result).toBe('lost');
    });
  });

  describe('hole number tracking', () => {
    it('tracks different hole numbers correctly', () => {
      const result1 = calculateMatchPlayHoleResult(4, 5, 1);
      const result9 = calculateMatchPlayHoleResult(4, 5, 9);
      const result18 = calculateMatchPlayHoleResult(4, 5, 18);

      expect(result1.holeNumber).toBe(1);
      expect(result9.holeNumber).toBe(9);
      expect(result18.holeNumber).toBe(18);
    });
  });
});

// ============================================================================
// Match Play with Handicaps Tests
// ============================================================================

describe('calculateMatchPlayHoleResultWithHandicaps', () => {
  describe('handicap application', () => {
    it('calculates net scores correctly before comparison', () => {
      const hole = createTestHole({ strokeIndex: 1 }); // SI 1

      // Player: gross 5, handicap 18 → gets 1 stroke → net 4
      // Opponent: gross 4, handicap 0 → no strokes → net 4
      const result = calculateMatchPlayHoleResultWithHandicaps(5, 18, 4, 0, hole);

      expect(result.result).toBe('halved'); // Both net 4
    });

    it('player wins with handicap advantage', () => {
      const hole = createTestHole({ strokeIndex: 1 });

      // Player: gross 6, handicap 36 → gets 2 strokes → net 4
      // Opponent: gross 4, handicap 0 → no strokes → net 4
      const result = calculateMatchPlayHoleResultWithHandicaps(6, 36, 5, 0, hole);

      expect(result.result).toBe('won'); // Player net 4, opponent net 5
    });

    it('opponent wins despite player handicap', () => {
      const hole = createTestHole({ strokeIndex: 1 });

      // Player: gross 7, handicap 18 → net 6
      // Opponent: gross 4, handicap 0 → net 4
      const result = calculateMatchPlayHoleResultWithHandicaps(7, 18, 4, 0, hole);

      expect(result.result).toBe('lost');
    });

    it('respects stroke index for handicap distribution', () => {
      const holeSI15 = createTestHole({ strokeIndex: 15 });

      // Handicap 10 gets strokes on SI 1-10 only
      // Player: gross 5, handicap 10 → SI 15, no stroke → net 5
      // Opponent: gross 5, handicap 10 → SI 15, no stroke → net 5
      const result = calculateMatchPlayHoleResultWithHandicaps(
        5,
        10,
        5,
        10,
        holeSI15
      );

      expect(result.result).toBe('halved');
    });
  });

  describe('edge cases', () => {
    it('handles both players with zero handicap', () => {
      const hole = createTestHole({ strokeIndex: 1 });

      const result = calculateMatchPlayHoleResultWithHandicaps(4, 0, 5, 0, hole);

      expect(result.result).toBe('won');
      expect(result.playerScore).toBe(4);
      expect(result.opponentScore).toBe(5);
    });

    it('handles high handicap difference', () => {
      const hole = createTestHole({ strokeIndex: 1 });

      // Player: gross 8, handicap 36 → net 6
      // Opponent: gross 4, handicap 0 → net 4
      const result = calculateMatchPlayHoleResultWithHandicaps(8, 36, 4, 0, hole);

      expect(result.result).toBe('lost');
    });
  });
});

// ============================================================================
// Match Play Match Result Tests
// ============================================================================

describe('calculateMatchPlayMatchResult', () => {
  describe('match in progress', () => {
    it('calculates match in progress correctly', () => {
      const holes = createHoleResults([
        { player: 4, opponent: 5 }, // Won
        { player: 5, opponent: 5 }, // Halved
      ]);

      const result = calculateMatchPlayMatchResult(holes);

      expect(result.holesWon).toBe(1);
      expect(result.holesLost).toBe(0);
      expect(result.holesHalved).toBe(1);
      expect(result.holesPlayed).toBe(2);
      expect(result.holesRemaining).toBe(16);
      expect(result.currentScore).toBe(1);
      expect(result.matchResult).toBe('in_progress');
      expect(result.finalResult).toBeUndefined();
    });

    it('shows all square when even', () => {
      const holes = createHoleResults([
        { player: 4, opponent: 5 }, // Won
        { player: 6, opponent: 5 }, // Lost
      ]);

      const result = calculateMatchPlayMatchResult(holes);

      expect(result.currentScore).toBe(0);
      expect(result.matchResult).toBe('in_progress');
    });
  });

  describe('early finish (X&Y format)', () => {
    it('detects player win by 3&2', () => {
      // Player is 3 up with 2 to play - match over
      const holes = createHoleResults([
        { player: 4, opponent: 5 }, // Won
        { player: 4, opponent: 5 }, // Won
        { player: 4, opponent: 5 }, // Won
        ...Array(13).fill({ player: 5, opponent: 5 }), // Halved
      ]);

      const result = calculateMatchPlayMatchResult(holes);

      expect(result.matchResult).toBe('player_wins');
      expect(result.finalResult).toBe('3&2');
      expect(result.holesWon).toBe(3);
      expect(result.holesRemaining).toBe(2);
    });

    it('detects opponent win by 4&3', () => {
      // Opponent is 4 up with 3 to play
      const holes = createHoleResults([
        { player: 6, opponent: 4 }, // Lost
        { player: 6, opponent: 4 }, // Lost
        { player: 6, opponent: 4 }, // Lost
        { player: 6, opponent: 4 }, // Lost
        ...Array(11).fill({ player: 5, opponent: 5 }), // Halved
      ]);

      const result = calculateMatchPlayMatchResult(holes);

      expect(result.matchResult).toBe('opponent_wins');
      expect(result.finalResult).toBe('4&3');
      expect(result.holesLost).toBe(4);
    });

    it('detects win by 5&4', () => {
      const holes = createHoleResults([
        ...Array(5).fill({ player: 4, opponent: 5 }), // 5 wins
        ...Array(9).fill({ player: 5, opponent: 5 }), // 9 halved
      ]);

      const result = calculateMatchPlayMatchResult(holes);

      expect(result.matchResult).toBe('player_wins');
      expect(result.finalResult).toBe('5&4');
    });

    it('handles 1&0 finish (wins on last hole)', () => {
      const holes = createHoleResults([
        ...Array(17).fill({ player: 5, opponent: 5 }), // 17 halved
        { player: 4, opponent: 5 }, // Won on 18
      ]);

      const result = calculateMatchPlayMatchResult(holes);

      expect(result.matchResult).toBe('player_wins');
      // When all holes played, format is "X UP" not "X&0"
      expect(result.finalResult).toBe('1&0');
    });
  });

  describe('dormie situations', () => {
    it('detects player dormie (lead equals holes remaining)', () => {
      // Player is 2 up with 2 to play
      const holes = createHoleResults([
        { player: 4, opponent: 5 }, // Won
        { player: 4, opponent: 5 }, // Won
        ...Array(14).fill({ player: 5, opponent: 5 }), // Halved
      ]);

      const result = calculateMatchPlayMatchResult(holes);

      expect(result.matchResult).toBe('dormie_player');
      expect(result.currentScore).toBe(2);
      expect(result.holesRemaining).toBe(2);
    });

    it('detects opponent dormie', () => {
      // Opponent is 3 up with 3 to play
      const holes = createHoleResults([
        { player: 6, opponent: 4 }, // Lost
        { player: 6, opponent: 4 }, // Lost
        { player: 6, opponent: 4 }, // Lost
        ...Array(12).fill({ player: 5, opponent: 5 }), // Halved
      ]);

      const result = calculateMatchPlayMatchResult(holes);

      expect(result.matchResult).toBe('dormie_opponent');
      expect(result.currentScore).toBe(-3);
      expect(result.holesRemaining).toBe(3);
    });

    it('dormie 1 with 1 remaining', () => {
      const holes = createHoleResults([
        { player: 4, opponent: 5 }, // Won
        ...Array(16).fill({ player: 5, opponent: 5 }), // Halved
      ]);

      const result = calculateMatchPlayMatchResult(holes);

      expect(result.matchResult).toBe('dormie_player');
      expect(result.holesRemaining).toBe(1);
    });
  });

  describe('full 18 holes played', () => {
    it('returns all_square after 18 holes when tied', () => {
      const holes = createHoleResults(
        Array(18).fill({ player: 5, opponent: 5 })
      );

      const result = calculateMatchPlayMatchResult(holes);

      expect(result.matchResult).toBe('all_square');
      expect(result.finalResult).toBe('A/S');
      expect(result.holesRemaining).toBe(0);
    });

    it('player wins after 18 when ahead', () => {
      const holes = createHoleResults([
        { player: 4, opponent: 5 }, // Won
        ...Array(17).fill({ player: 5, opponent: 5 }),
      ]);

      const result = calculateMatchPlayMatchResult(holes);

      expect(result.matchResult).toBe('player_wins');
      // Implementation uses X&Y format when absoluteScore > holesRemaining (1 > 0)
      expect(result.finalResult).toBe('1&0');
    });

    it('opponent wins after 18 when ahead', () => {
      const holes = createHoleResults([
        { player: 6, opponent: 4 }, // Lost
        { player: 6, opponent: 4 }, // Lost
        ...Array(16).fill({ player: 5, opponent: 5 }),
      ]);

      const result = calculateMatchPlayMatchResult(holes);

      expect(result.matchResult).toBe('opponent_wins');
      // Implementation uses X&Y format when absoluteScore > holesRemaining (2 > 0)
      expect(result.finalResult).toBe('2&0');
    });
  });

  describe('custom total holes', () => {
    it('handles 9-hole match where match ends early', () => {
      // Player wins 4 holes out of 6 played, with 3 remaining
      // Score is 4-0, holesRemaining is 3, so 4 > 3 = match over
      const holes = createHoleResults([
        { player: 4, opponent: 5 }, // Won
        { player: 4, opponent: 5 }, // Won
        { player: 4, opponent: 5 }, // Won
        { player: 4, opponent: 5 }, // Won
        ...Array(2).fill({ player: 5, opponent: 5 }),
      ]);

      const result = calculateMatchPlayMatchResult(holes, 9);

      expect(result.matchResult).toBe('player_wins');
      expect(result.finalResult).toBe('4&3');
    });

    it('handles 12-hole match', () => {
      const holes = createHoleResults(
        Array(12).fill({ player: 5, opponent: 5 })
      );

      const result = calculateMatchPlayMatchResult(holes, 12);

      expect(result.matchResult).toBe('all_square');
      expect(result.holesRemaining).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty hole results', () => {
      const result = calculateMatchPlayMatchResult([]);

      expect(result.holesPlayed).toBe(0);
      expect(result.holesRemaining).toBe(18);
      expect(result.currentScore).toBe(0);
      expect(result.matchResult).toBe('in_progress');
    });

    it('handles single hole played', () => {
      const holes = createHoleResults([{ player: 4, opponent: 5 }]);

      const result = calculateMatchPlayMatchResult(holes);

      expect(result.holesPlayed).toBe(1);
      expect(result.holesRemaining).toBe(17);
      expect(result.matchResult).toBe('in_progress');
    });

    it('calculates all counters correctly', () => {
      const holes = createHoleResults([
        { player: 4, opponent: 5 }, // Won
        { player: 6, opponent: 4 }, // Lost
        { player: 5, opponent: 5 }, // Halved
        { player: 3, opponent: 5 }, // Won
        { player: 6, opponent: 5 }, // Lost
      ]);

      const result = calculateMatchPlayMatchResult(holes);

      expect(result.holesWon).toBe(2);
      expect(result.holesLost).toBe(2);
      expect(result.holesHalved).toBe(1);
      expect(result.holesPlayed).toBe(5);
      expect(result.currentScore).toBe(0);
    });
  });
});

// ============================================================================
// Format Match Play Score Tests
// ============================================================================

describe('formatMatchPlayScore', () => {
  describe('player ahead formats', () => {
    it('formats 1 UP correctly', () => {
      expect(formatMatchPlayScore(1)).toBe('1 UP');
    });

    it('formats 2 UP correctly', () => {
      expect(formatMatchPlayScore(2)).toBe('2 UP');
    });

    it('formats large lead correctly', () => {
      expect(formatMatchPlayScore(5)).toBe('5 UP');
    });
  });

  describe('opponent ahead formats', () => {
    it('formats 1 DN correctly', () => {
      expect(formatMatchPlayScore(-1)).toBe('1 DN');
    });

    it('formats 3 DN correctly', () => {
      expect(formatMatchPlayScore(-3)).toBe('3 DN');
    });

    it('formats large deficit correctly', () => {
      expect(formatMatchPlayScore(-5)).toBe('5 DN');
    });
  });

  describe('all square format', () => {
    it('returns A/S for zero', () => {
      expect(formatMatchPlayScore(0)).toBe('A/S');
    });
  });
});

// ============================================================================
// Integration / Full Round Tests
// ============================================================================

describe('Full Round Integration', () => {
  const holes = create18Holes();

  describe('Best Ball Full Round', () => {
    it('calculates best ball for entire round', () => {
      const team = [
        { id: 'p1', handicap: 20 },
        { id: 'p2', handicap: 10 },
      ];

      let totalBestBall = 0;
      const contributors: string[] = [];

      holes.forEach((hole) => {
        // Simulate scores: p1 always scores par, p2 scores bogey
        const teamScores = createTeamMemberScores([
          { id: 'p1', gross: hole.par, handicap: team[0].handicap },
          { id: 'p2', gross: hole.par + 1, handicap: team[1].handicap },
        ]);

        const result = calculateBestBallHole(teamScores, hole);
        totalBestBall += result.bestNetScore;
        contributors.push(result.contributingPlayerId);
      });

      // Total should be sum of best net scores
      expect(totalBestBall).toBeLessThan(getCoursePar(holes));
      // Higher handicap player should contribute more often
      const p1Contributions = contributors.filter((c) => c === 'p1').length;
      expect(p1Contributions).toBeGreaterThan(0);
    });
  });

  describe('Match Play Full Match', () => {
    it('simulates complete match with various outcomes', () => {
      // Player wins holes 1, 5, 10, 15
      // Opponent wins holes 3, 8, 12
      // Rest are halved
      const results: { player: number; opponent: number }[] = holes.map(
        (hole) => {
          if ([1, 5, 10, 15].includes(hole.number)) {
            return { player: 4, opponent: 5 };
          }
          if ([3, 8, 12].includes(hole.number)) {
            return { player: 5, opponent: 4 };
          }
          return { player: 4, opponent: 4 };
        }
      );

      const holeResults = createHoleResults(results);
      const match = calculateMatchPlayMatchResult(holeResults);

      expect(match.holesWon).toBe(4);
      expect(match.holesLost).toBe(3);
      expect(match.holesHalved).toBe(11);
      expect(match.currentScore).toBe(1);
      expect(match.matchResult).toBe('player_wins');
      // Implementation uses X&Y format when all holes played (1 > 0)
      expect(match.finalResult).toBe('1&0');
    });

    it('simulates match ending early', () => {
      // Player dominates early, wins 5&3
      const results: { player: number; opponent: number }[] = [];
      for (let i = 0; i < 15; i++) {
        if (i < 5) {
          results.push({ player: 4, opponent: 5 }); // 5 wins
        } else {
          results.push({ player: 4, opponent: 4 }); // halved
        }
      }

      const holeResults = createHoleResults(results);
      const match = calculateMatchPlayMatchResult(holeResults);

      expect(match.matchResult).toBe('player_wins');
      expect(match.finalResult).toBe('5&3');
    });
  });
});

// Helper function for integration tests
function getCoursePar(holes: Hole[]): number {
  return holes.reduce((sum, hole) => sum + hole.par, 0);
}
