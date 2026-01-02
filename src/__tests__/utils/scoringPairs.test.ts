/**
 * Scoring Pairs Tests
 *
 * Comprehensive tests for scoring pair generation utilities:
 * - Reciprocal pairing (A↔B)
 * - Circular chain pairing (A→B→C→A)
 * - Auto-pairing strategy selection
 * - Cross-team pairing with even/uneven teams
 * - Validation of scoring pairs coverage
 * - Shuffle utility for randomization
 *
 * @file src/__tests__/utils/scoringPairs.test.ts
 */

import {
  generateReciprocalPairs,
  generateCircularChain,
  autoGenerateScoringPairs,
  generateCrossTeamPairs,
  validateScoringPairsCoverage,
  shuffleForPairing,
} from '@/utils/scoringPairs';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create an array of test players with specified IDs
 */
function createPlayers(ids: string[]): { id: string }[] {
  return ids.map((id) => ({ id }));
}

/**
 * Create players with numeric IDs (p1, p2, p3, etc.)
 */
function createNumberedPlayers(count: number): { id: string }[] {
  return Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}` }));
}

/**
 * Extract all player IDs from scoring pairs
 */
function extractPlayerIds(
  pairs: { scorerId: string; playerId: string }[]
): { scorerIds: string[]; playerIds: string[] } {
  return {
    scorerIds: pairs.map((p) => p.scorerId),
    playerIds: pairs.map((p) => p.playerId),
  };
}

// ============================================================================
// generateReciprocalPairs Tests
// ============================================================================

describe('generateReciprocalPairs', () => {
  describe('basic functionality', () => {
    it('generates reciprocal pairs for 2 players', () => {
      const players = createPlayers(['A', 'B']);
      const pairs = generateReciprocalPairs(players);

      expect(pairs).toHaveLength(2);
      expect(pairs).toContainEqual({ scorerId: 'A', playerId: 'B' });
      expect(pairs).toContainEqual({ scorerId: 'B', playerId: 'A' });
    });

    it('generates reciprocal pairs for 4 players', () => {
      const players = createPlayers(['A', 'B', 'C', 'D']);
      const pairs = generateReciprocalPairs(players);

      expect(pairs).toHaveLength(4);
      // A↔B
      expect(pairs).toContainEqual({ scorerId: 'A', playerId: 'B' });
      expect(pairs).toContainEqual({ scorerId: 'B', playerId: 'A' });
      // C↔D
      expect(pairs).toContainEqual({ scorerId: 'C', playerId: 'D' });
      expect(pairs).toContainEqual({ scorerId: 'D', playerId: 'C' });
    });

    it('generates reciprocal pairs for 6 players', () => {
      const players = createNumberedPlayers(6);
      const pairs = generateReciprocalPairs(players);

      expect(pairs).toHaveLength(6);
      // Each player should score exactly one other and be scored by exactly one
      const { scorerIds, playerIds } = extractPlayerIds(pairs);
      expect(scorerIds.sort()).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
      expect(playerIds.sort()).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
    });

    it('pairs adjacent players correctly', () => {
      const players = createPlayers(['A', 'B', 'C', 'D']);
      const pairs = generateReciprocalPairs(players);

      // Verify pairing pattern: (0,1), (2,3)
      const pairMap = new Map<string, string>();
      pairs.forEach((pair) => {
        if (!pairMap.has(pair.scorerId)) {
          pairMap.set(pair.scorerId, pair.playerId);
        }
      });

      // A scores B
      expect(pairMap.get('A')).toBe('B');
      // B scores A
      expect(pairMap.get('B')).toBe('A');
      // C scores D
      expect(pairMap.get('C')).toBe('D');
      // D scores C
      expect(pairMap.get('D')).toBe('C');
    });
  });

  describe('larger groups', () => {
    it('handles 8 players', () => {
      const players = createNumberedPlayers(8);
      const pairs = generateReciprocalPairs(players);

      expect(pairs).toHaveLength(8);

      // Verify each player appears exactly once as scorer and once as player
      const scorerCount = new Map<string, number>();
      const playerCount = new Map<string, number>();

      pairs.forEach((pair) => {
        scorerCount.set(pair.scorerId, (scorerCount.get(pair.scorerId) || 0) + 1);
        playerCount.set(pair.playerId, (playerCount.get(pair.playerId) || 0) + 1);
      });

      players.forEach((p) => {
        expect(scorerCount.get(p.id)).toBe(1);
        expect(playerCount.get(p.id)).toBe(1);
      });
    });

    it('handles 16 players', () => {
      const players = createNumberedPlayers(16);
      const pairs = generateReciprocalPairs(players);

      expect(pairs).toHaveLength(16);
    });
  });

  describe('error handling', () => {
    it('throws error for less than 2 players', () => {
      const singlePlayer = createPlayers(['A']);

      expect(() => generateReciprocalPairs(singlePlayer)).toThrow(
        'At least 2 players are required for reciprocal pairs'
      );
    });

    it('throws error for empty array', () => {
      expect(() => generateReciprocalPairs([])).toThrow(
        'At least 2 players are required for reciprocal pairs'
      );
    });

    it('throws error for odd number of players', () => {
      const oddPlayers = createPlayers(['A', 'B', 'C']);

      expect(() => generateReciprocalPairs(oddPlayers)).toThrow(
        'Reciprocal pairs require an even number of players. Got 3 players.'
      );
    });

    it('throws error for 5 players (odd)', () => {
      const oddPlayers = createNumberedPlayers(5);

      expect(() => generateReciprocalPairs(oddPlayers)).toThrow(
        'Reciprocal pairs require an even number of players. Got 5 players.'
      );
    });

    it('throws error for 7 players (odd)', () => {
      const oddPlayers = createNumberedPlayers(7);

      expect(() => generateReciprocalPairs(oddPlayers)).toThrow(
        'Reciprocal pairs require an even number of players. Got 7 players.'
      );
    });
  });
});

// ============================================================================
// generateCircularChain Tests
// ============================================================================

describe('generateCircularChain', () => {
  describe('basic functionality', () => {
    it('generates circular chain for 2 players', () => {
      const players = createPlayers(['A', 'B']);
      const pairs = generateCircularChain(players);

      expect(pairs).toHaveLength(2);
      expect(pairs).toContainEqual({ scorerId: 'A', playerId: 'B' });
      expect(pairs).toContainEqual({ scorerId: 'B', playerId: 'A' });
    });

    it('generates circular chain for 3 players', () => {
      const players = createPlayers(['A', 'B', 'C']);
      const pairs = generateCircularChain(players);

      expect(pairs).toHaveLength(3);
      expect(pairs).toContainEqual({ scorerId: 'A', playerId: 'B' }); // A→B
      expect(pairs).toContainEqual({ scorerId: 'B', playerId: 'C' }); // B→C
      expect(pairs).toContainEqual({ scorerId: 'C', playerId: 'A' }); // C→A (loop)
    });

    it('generates circular chain for 4 players', () => {
      const players = createPlayers(['A', 'B', 'C', 'D']);
      const pairs = generateCircularChain(players);

      expect(pairs).toHaveLength(4);
      expect(pairs[0]).toEqual({ scorerId: 'A', playerId: 'B' });
      expect(pairs[1]).toEqual({ scorerId: 'B', playerId: 'C' });
      expect(pairs[2]).toEqual({ scorerId: 'C', playerId: 'D' });
      expect(pairs[3]).toEqual({ scorerId: 'D', playerId: 'A' }); // Loop back
    });

    it('generates circular chain for 5 players (odd number)', () => {
      const players = createPlayers(['A', 'B', 'C', 'D', 'E']);
      const pairs = generateCircularChain(players);

      expect(pairs).toHaveLength(5);
      // A→B→C→D→E→A
      expect(pairs[0]).toEqual({ scorerId: 'A', playerId: 'B' });
      expect(pairs[1]).toEqual({ scorerId: 'B', playerId: 'C' });
      expect(pairs[2]).toEqual({ scorerId: 'C', playerId: 'D' });
      expect(pairs[3]).toEqual({ scorerId: 'D', playerId: 'E' });
      expect(pairs[4]).toEqual({ scorerId: 'E', playerId: 'A' });
    });
  });

  describe('chain integrity', () => {
    it('each player scores exactly one other', () => {
      const players = createNumberedPlayers(7);
      const pairs = generateCircularChain(players);

      const scorerCount = new Map<string, number>();
      pairs.forEach((pair) => {
        scorerCount.set(pair.scorerId, (scorerCount.get(pair.scorerId) || 0) + 1);
      });

      players.forEach((p) => {
        expect(scorerCount.get(p.id)).toBe(1);
      });
    });

    it('each player is scored exactly once', () => {
      const players = createNumberedPlayers(7);
      const pairs = generateCircularChain(players);

      const playerCount = new Map<string, number>();
      pairs.forEach((pair) => {
        playerCount.set(pair.playerId, (playerCount.get(pair.playerId) || 0) + 1);
      });

      players.forEach((p) => {
        expect(playerCount.get(p.id)).toBe(1);
      });
    });

    it('forms a complete cycle', () => {
      const players = createPlayers(['A', 'B', 'C', 'D']);
      const pairs = generateCircularChain(players);

      // Starting from A, follow the chain
      const visited = new Set<string>();
      let current = 'A';

      for (let i = 0; i < players.length; i++) {
        visited.add(current);
        const pair = pairs.find((p) => p.scorerId === current);
        expect(pair).toBeDefined();
        current = pair!.playerId;
      }

      // Should have visited all players
      expect(visited.size).toBe(players.length);
      // Should loop back to start
      expect(current).toBe('A');
    });
  });

  describe('larger groups', () => {
    it('handles 10 players', () => {
      const players = createNumberedPlayers(10);
      const pairs = generateCircularChain(players);

      expect(pairs).toHaveLength(10);
      // Last player should score first
      expect(pairs[9]).toEqual({ scorerId: 'p10', playerId: 'p1' });
    });

    it('handles 15 players (odd)', () => {
      const players = createNumberedPlayers(15);
      const pairs = generateCircularChain(players);

      expect(pairs).toHaveLength(15);
    });
  });

  describe('error handling', () => {
    it('throws error for less than 2 players', () => {
      const singlePlayer = createPlayers(['A']);

      expect(() => generateCircularChain(singlePlayer)).toThrow(
        'At least 2 players are required for circular chain'
      );
    });

    it('throws error for empty array', () => {
      expect(() => generateCircularChain([])).toThrow(
        'At least 2 players are required for circular chain'
      );
    });
  });
});

// ============================================================================
// autoGenerateScoringPairs Tests
// ============================================================================

describe('autoGenerateScoringPairs', () => {
  describe('strategy selection', () => {
    it('uses reciprocal for 2 players (even)', () => {
      const players = createPlayers(['A', 'B']);
      const result = autoGenerateScoringPairs(players);

      expect(result.type).toBe('reciprocal');
      expect(result.pairs).toHaveLength(2);
    });

    it('uses reciprocal for 4 players (even)', () => {
      const players = createNumberedPlayers(4);
      const result = autoGenerateScoringPairs(players);

      expect(result.type).toBe('reciprocal');
      expect(result.pairs).toHaveLength(4);
    });

    it('uses reciprocal for 8 players (even)', () => {
      const players = createNumberedPlayers(8);
      const result = autoGenerateScoringPairs(players);

      expect(result.type).toBe('reciprocal');
      expect(result.pairs).toHaveLength(8);
    });

    it('uses circular for 3 players (odd)', () => {
      const players = createPlayers(['A', 'B', 'C']);
      const result = autoGenerateScoringPairs(players);

      expect(result.type).toBe('circular');
      expect(result.pairs).toHaveLength(3);
    });

    it('uses circular for 5 players (odd)', () => {
      const players = createNumberedPlayers(5);
      const result = autoGenerateScoringPairs(players);

      expect(result.type).toBe('circular');
      expect(result.pairs).toHaveLength(5);
    });

    it('uses circular for 7 players (odd)', () => {
      const players = createNumberedPlayers(7);
      const result = autoGenerateScoringPairs(players);

      expect(result.type).toBe('circular');
      expect(result.pairs).toHaveLength(7);
    });
  });

  describe('result validation', () => {
    it('generates valid reciprocal pairs for even count', () => {
      const players = createNumberedPlayers(6);
      const result = autoGenerateScoringPairs(players);

      // Verify each player scores and is scored exactly once
      const validation = validateScoringPairsCoverage(
        result.pairs,
        players.map((p) => p.id)
      );

      expect(validation.isValid).toBe(true);
    });

    it('generates valid circular chain for odd count', () => {
      const players = createNumberedPlayers(5);
      const result = autoGenerateScoringPairs(players);

      // Verify each player scores and is scored exactly once
      const validation = validateScoringPairsCoverage(
        result.pairs,
        players.map((p) => p.id)
      );

      expect(validation.isValid).toBe(true);
    });
  });

  describe('error handling', () => {
    it('throws error for less than 2 players', () => {
      const singlePlayer = createPlayers(['A']);

      expect(() => autoGenerateScoringPairs(singlePlayer)).toThrow(
        'At least 2 players are required for auto-pairing'
      );
    });

    it('throws error for empty array', () => {
      expect(() => autoGenerateScoringPairs([])).toThrow(
        'At least 2 players are required for auto-pairing'
      );
    });
  });
});

// ============================================================================
// generateCrossTeamPairs Tests
// ============================================================================

describe('generateCrossTeamPairs', () => {
  describe('even teams', () => {
    it('generates pairs for 2v2 teams', () => {
      const team1 = createPlayers(['A1', 'A2']);
      const team2 = createPlayers(['B1', 'B2']);
      const result = generateCrossTeamPairs(team1, team2);

      expect(result.pairs).toHaveLength(4);
      expect(result.metadata.hasUnevenTeams).toBe(false);
      expect(result.metadata.team1Size).toBe(2);
      expect(result.metadata.team2Size).toBe(2);
      expect(result.metadata.reusedPlayerIds).toEqual([]);
      expect(result.metadata.unassignedPlayerIds).toEqual([]);
      expect(result.metadata.extraPairingsCount).toBe(0);

      // A1↔B1
      expect(result.pairs).toContainEqual({ scorerId: 'A1', playerId: 'B1' });
      expect(result.pairs).toContainEqual({ scorerId: 'B1', playerId: 'A1' });
      // A2↔B2
      expect(result.pairs).toContainEqual({ scorerId: 'A2', playerId: 'B2' });
      expect(result.pairs).toContainEqual({ scorerId: 'B2', playerId: 'A2' });
    });

    it('generates pairs for 3v3 teams', () => {
      const team1 = createPlayers(['A1', 'A2', 'A3']);
      const team2 = createPlayers(['B1', 'B2', 'B3']);
      const result = generateCrossTeamPairs(team1, team2);

      expect(result.pairs).toHaveLength(6);
      expect(result.metadata.hasUnevenTeams).toBe(false);
    });

    it('generates pairs for 4v4 teams', () => {
      const team1 = createNumberedPlayers(4);
      const team2 = createPlayers(['B1', 'B2', 'B3', 'B4']);
      const result = generateCrossTeamPairs(team1, team2);

      expect(result.pairs).toHaveLength(8);
      expect(result.metadata.hasUnevenTeams).toBe(false);
    });
  });

  describe('uneven teams with wrap strategy (default)', () => {
    it('handles 3v2 teams - reuses smaller team players', () => {
      const team1 = createPlayers(['A1', 'A2', 'A3']);
      const team2 = createPlayers(['B1', 'B2']);
      const result = generateCrossTeamPairs(team1, team2);

      expect(result.pairs).toHaveLength(6); // 3 iterations × 2 pairs each
      expect(result.metadata.hasUnevenTeams).toBe(true);
      expect(result.metadata.team1Size).toBe(3);
      expect(result.metadata.team2Size).toBe(2);
      expect(result.metadata.strategyUsed).toBe('wrap');
      expect(result.metadata.reusedPlayerIds).toContain('B1'); // B1 is reused
      expect(result.metadata.extraPairingsCount).toBe(1);
      expect(result.metadata.unassignedPlayerIds).toEqual([]);
    });

    it('handles 4v3 teams - wrap strategy', () => {
      const team1 = createPlayers(['A1', 'A2', 'A3', 'A4']);
      const team2 = createPlayers(['B1', 'B2', 'B3']);
      const result = generateCrossTeamPairs(team1, team2, 'wrap');

      expect(result.pairs).toHaveLength(8); // 4 iterations × 2 pairs each
      expect(result.metadata.hasUnevenTeams).toBe(true);
      expect(result.metadata.reusedPlayerIds).toContain('B1');
      expect(result.metadata.extraPairingsCount).toBe(1);
    });

    it('handles 2v4 teams - smaller team 1 gets reused', () => {
      const team1 = createPlayers(['A1', 'A2']);
      const team2 = createPlayers(['B1', 'B2', 'B3', 'B4']);
      const result = generateCrossTeamPairs(team1, team2);

      expect(result.pairs).toHaveLength(8);
      expect(result.metadata.hasUnevenTeams).toBe(true);
      expect(result.metadata.reusedPlayerIds).toContain('A1');
      expect(result.metadata.reusedPlayerIds).toContain('A2');
      expect(result.metadata.extraPairingsCount).toBe(2);
    });

    it('wrap strategy creates correct pairings for 5v3', () => {
      const team1 = createPlayers(['A1', 'A2', 'A3', 'A4', 'A5']);
      const team2 = createPlayers(['B1', 'B2', 'B3']);
      const result = generateCrossTeamPairs(team1, team2);

      expect(result.pairs).toHaveLength(10);
      // Verify the wrapping pattern
      // A1↔B1, A2↔B2, A3↔B3, A4↔B1 (wrap), A5↔B2 (wrap)
      expect(result.pairs).toContainEqual({ scorerId: 'A4', playerId: 'B1' });
      expect(result.pairs).toContainEqual({ scorerId: 'A5', playerId: 'B2' });
    });
  });

  describe('uneven teams with partial strategy', () => {
    it('handles 3v2 teams - leaves excess unassigned', () => {
      const team1 = createPlayers(['A1', 'A2', 'A3']);
      const team2 = createPlayers(['B1', 'B2']);
      const result = generateCrossTeamPairs(team1, team2, 'partial');

      expect(result.pairs).toHaveLength(4); // Only 2 iterations
      expect(result.metadata.hasUnevenTeams).toBe(true);
      expect(result.metadata.strategyUsed).toBe('partial');
      expect(result.metadata.unassignedPlayerIds).toContain('A3');
      expect(result.metadata.reusedPlayerIds).toEqual([]);
      expect(result.metadata.extraPairingsCount).toBe(0);
    });

    it('handles 4v3 teams - partial strategy', () => {
      const team1 = createPlayers(['A1', 'A2', 'A3', 'A4']);
      const team2 = createPlayers(['B1', 'B2', 'B3']);
      const result = generateCrossTeamPairs(team1, team2, 'partial');

      expect(result.pairs).toHaveLength(6);
      expect(result.metadata.unassignedPlayerIds).toContain('A4');
    });

    it('handles 2v4 teams - smaller team determines pairings', () => {
      const team1 = createPlayers(['A1', 'A2']);
      const team2 = createPlayers(['B1', 'B2', 'B3', 'B4']);
      const result = generateCrossTeamPairs(team1, team2, 'partial');

      expect(result.pairs).toHaveLength(4);
      expect(result.metadata.unassignedPlayerIds).toContain('B3');
      expect(result.metadata.unassignedPlayerIds).toContain('B4');
    });
  });

  describe('single player teams', () => {
    it('handles 1v1 teams', () => {
      const team1 = createPlayers(['A1']);
      const team2 = createPlayers(['B1']);
      const result = generateCrossTeamPairs(team1, team2);

      expect(result.pairs).toHaveLength(2);
      expect(result.pairs).toContainEqual({ scorerId: 'A1', playerId: 'B1' });
      expect(result.pairs).toContainEqual({ scorerId: 'B1', playerId: 'A1' });
      expect(result.metadata.hasUnevenTeams).toBe(false);
    });

    it('handles 1v2 teams with wrap', () => {
      const team1 = createPlayers(['A1']);
      const team2 = createPlayers(['B1', 'B2']);
      const result = generateCrossTeamPairs(team1, team2, 'wrap');

      expect(result.pairs).toHaveLength(4);
      expect(result.metadata.reusedPlayerIds).toContain('A1');
    });

    it('handles 1v2 teams with partial', () => {
      const team1 = createPlayers(['A1']);
      const team2 = createPlayers(['B1', 'B2']);
      const result = generateCrossTeamPairs(team1, team2, 'partial');

      expect(result.pairs).toHaveLength(2);
      expect(result.metadata.unassignedPlayerIds).toContain('B2');
    });
  });

  describe('error handling', () => {
    it('throws error for empty team 1', () => {
      const team2 = createPlayers(['B1', 'B2']);

      expect(() => generateCrossTeamPairs([], team2)).toThrow(
        'Team 1 must have at least one player'
      );
    });

    it('throws error for empty team 2', () => {
      const team1 = createPlayers(['A1', 'A2']);

      expect(() => generateCrossTeamPairs(team1, [])).toThrow(
        'Team 2 must have at least one player'
      );
    });

    it('throws error for both teams empty', () => {
      expect(() => generateCrossTeamPairs([], [])).toThrow(
        'Team 1 must have at least one player'
      );
    });
  });

  describe('metadata accuracy', () => {
    it('tracks team sizes correctly', () => {
      const team1 = createNumberedPlayers(5);
      const team2 = createPlayers(['B1', 'B2', 'B3']);
      const result = generateCrossTeamPairs(team1, team2);

      expect(result.metadata.team1Size).toBe(5);
      expect(result.metadata.team2Size).toBe(3);
    });

    it('counts extra pairings correctly for large difference', () => {
      const team1 = createNumberedPlayers(6);
      const team2 = createPlayers(['B1', 'B2']);
      const result = generateCrossTeamPairs(team1, team2);

      expect(result.metadata.extraPairingsCount).toBe(4); // 6 - 2 = 4 extra
    });
  });
});

// ============================================================================
// validateScoringPairsCoverage Tests
// ============================================================================

describe('validateScoringPairsCoverage', () => {
  describe('valid coverage', () => {
    it('validates reciprocal pairs as valid', () => {
      const pairs = [
        { scorerId: 'A', playerId: 'B' },
        { scorerId: 'B', playerId: 'A' },
      ];
      const playerIds = ['A', 'B'];

      const result = validateScoringPairsCoverage(pairs, playerIds);

      expect(result.isValid).toBe(true);
      expect(result.missingPlayers).toEqual([]);
      expect(result.duplicatePlayers).toEqual([]);
      expect(result.missingScorers).toEqual([]);
    });

    it('validates circular chain as valid', () => {
      const pairs = [
        { scorerId: 'A', playerId: 'B' },
        { scorerId: 'B', playerId: 'C' },
        { scorerId: 'C', playerId: 'A' },
      ];
      const playerIds = ['A', 'B', 'C'];

      const result = validateScoringPairsCoverage(pairs, playerIds);

      expect(result.isValid).toBe(true);
      expect(result.missingPlayers).toEqual([]);
      expect(result.duplicatePlayers).toEqual([]);
    });

    it('validates larger reciprocal group', () => {
      const players = createNumberedPlayers(6);
      const pairs = generateReciprocalPairs(players);

      const result = validateScoringPairsCoverage(
        pairs,
        players.map((p) => p.id)
      );

      expect(result.isValid).toBe(true);
    });

    it('validates larger circular group', () => {
      const players = createNumberedPlayers(7);
      const pairs = generateCircularChain(players);

      const result = validateScoringPairsCoverage(
        pairs,
        players.map((p) => p.id)
      );

      expect(result.isValid).toBe(true);
    });
  });

  describe('missing players', () => {
    it('detects when a player is not being scored', () => {
      const pairs = [
        { scorerId: 'A', playerId: 'B' },
        { scorerId: 'B', playerId: 'A' },
      ];
      const playerIds = ['A', 'B', 'C']; // C is not scored

      const result = validateScoringPairsCoverage(pairs, playerIds);

      expect(result.isValid).toBe(false);
      expect(result.missingPlayers).toContain('C');
    });

    it('detects multiple missing players', () => {
      const pairs = [
        { scorerId: 'A', playerId: 'B' },
        { scorerId: 'B', playerId: 'A' },
      ];
      const playerIds = ['A', 'B', 'C', 'D'];

      const result = validateScoringPairsCoverage(pairs, playerIds);

      expect(result.isValid).toBe(false);
      expect(result.missingPlayers).toContain('C');
      expect(result.missingPlayers).toContain('D');
      expect(result.missingPlayers).toHaveLength(2);
    });
  });

  describe('duplicate players', () => {
    it('detects when a player is scored by multiple scorers', () => {
      const pairs = [
        { scorerId: 'A', playerId: 'B' },
        { scorerId: 'C', playerId: 'B' }, // B is scored twice
      ];
      const playerIds = ['A', 'B', 'C'];

      const result = validateScoringPairsCoverage(pairs, playerIds);

      expect(result.isValid).toBe(false);
      expect(result.duplicatePlayers).toContain('B');
    });

    it('detects multiple duplicate players', () => {
      const pairs = [
        { scorerId: 'A', playerId: 'B' },
        { scorerId: 'C', playerId: 'B' },
        { scorerId: 'D', playerId: 'E' },
        { scorerId: 'F', playerId: 'E' },
      ];
      const playerIds = ['A', 'B', 'C', 'D', 'E', 'F'];

      const result = validateScoringPairsCoverage(pairs, playerIds);

      expect(result.isValid).toBe(false);
      expect(result.duplicatePlayers).toContain('B');
      expect(result.duplicatePlayers).toContain('E');
    });
  });

  describe('missing scorers', () => {
    it('detects when a player is not scoring anyone', () => {
      const pairs = [
        { scorerId: 'A', playerId: 'B' },
        { scorerId: 'A', playerId: 'C' }, // A scores twice, B and C don't score
      ];
      const playerIds = ['A', 'B', 'C'];

      const result = validateScoringPairsCoverage(pairs, playerIds);

      expect(result.missingScorers).toContain('B');
      expect(result.missingScorers).toContain('C');
    });
  });

  describe('duplicate scorers', () => {
    it('tracks when a player scores multiple others', () => {
      const pairs = [
        { scorerId: 'A', playerId: 'B' },
        { scorerId: 'A', playerId: 'C' },
      ];
      const playerIds = ['A', 'B', 'C'];

      const result = validateScoringPairsCoverage(pairs, playerIds);

      expect(result.duplicateScorers).toContain('A');
    });
  });

  describe('edge cases', () => {
    it('handles empty pairs array', () => {
      const result = validateScoringPairsCoverage([], ['A', 'B']);

      expect(result.isValid).toBe(false);
      expect(result.missingPlayers).toContain('A');
      expect(result.missingPlayers).toContain('B');
      expect(result.missingScorers).toContain('A');
      expect(result.missingScorers).toContain('B');
    });

    it('handles empty player list', () => {
      const pairs = [{ scorerId: 'A', playerId: 'B' }];

      const result = validateScoringPairsCoverage(pairs, []);

      expect(result.isValid).toBe(true); // No players to check
      expect(result.missingPlayers).toEqual([]);
    });

    it('ignores pairs with unknown players', () => {
      // When only checking A and B, and A scores B, B scores A
      const pairs = [
        { scorerId: 'A', playerId: 'B' },
        { scorerId: 'B', playerId: 'A' },
        { scorerId: 'X', playerId: 'Y' }, // Unknown players - should be ignored
      ];
      const playerIds = ['A', 'B'];

      const result = validateScoringPairsCoverage(pairs, playerIds);

      expect(result.isValid).toBe(true); // A and B are both covered
    });
  });

  describe('cross-team validation', () => {
    it('validates cross-team pairs with wrap strategy', () => {
      const team1 = createPlayers(['A1', 'A2', 'A3']);
      const team2 = createPlayers(['B1', 'B2']);
      const crossResult = generateCrossTeamPairs(team1, team2, 'wrap');

      // All players from both teams
      const allPlayerIds = ['A1', 'A2', 'A3', 'B1', 'B2'];
      const result = validateScoringPairsCoverage(crossResult.pairs, allPlayerIds);

      // With wrap, everyone should be scored at least once
      expect(result.missingPlayers).toEqual([]);
      // But some may be scored multiple times due to wrapping, so duplicates expected
    });

    it('validates cross-team pairs with partial strategy', () => {
      const team1 = createPlayers(['A1', 'A2', 'A3']);
      const team2 = createPlayers(['B1', 'B2']);
      const crossResult = generateCrossTeamPairs(team1, team2, 'partial');

      const allPlayerIds = ['A1', 'A2', 'A3', 'B1', 'B2'];
      const result = validateScoringPairsCoverage(crossResult.pairs, allPlayerIds);

      // With partial, A3 will be missing
      expect(result.missingPlayers).toContain('A3');
    });
  });
});

// ============================================================================
// shuffleForPairing Tests
// ============================================================================

describe('shuffleForPairing', () => {
  describe('basic functionality', () => {
    it('returns array with same length', () => {
      const players = createNumberedPlayers(10);
      const shuffled = shuffleForPairing(players);

      expect(shuffled).toHaveLength(10);
    });

    it('returns array with same elements', () => {
      const players = createNumberedPlayers(5);
      const shuffled = shuffleForPairing(players);

      const originalIds = players.map((p) => p.id).sort();
      const shuffledIds = shuffled.map((p) => p.id).sort();

      expect(shuffledIds).toEqual(originalIds);
    });

    it('does not modify original array', () => {
      const players = createPlayers(['A', 'B', 'C', 'D']);
      const originalOrder = players.map((p) => p.id);

      shuffleForPairing(players);

      expect(players.map((p) => p.id)).toEqual(originalOrder);
    });

    it('handles empty array', () => {
      const shuffled = shuffleForPairing([]);
      expect(shuffled).toEqual([]);
    });

    it('handles single element', () => {
      const players = createPlayers(['A']);
      const shuffled = shuffleForPairing(players);

      expect(shuffled).toHaveLength(1);
      expect(shuffled[0].id).toBe('A');
    });

    it('handles two elements', () => {
      const players = createPlayers(['A', 'B']);
      const shuffled = shuffleForPairing(players);

      expect(shuffled).toHaveLength(2);
      expect(shuffled.map((p) => p.id).sort()).toEqual(['A', 'B']);
    });
  });

  describe('randomness verification', () => {
    it('produces different orderings over multiple runs', () => {
      const players = createNumberedPlayers(10);
      const results = new Set<string>();

      // Run shuffle multiple times and check for variation
      for (let i = 0; i < 50; i++) {
        const shuffled = shuffleForPairing(players);
        results.add(shuffled.map((p) => p.id).join(','));
      }

      // With 10 players, we should get multiple unique orderings in 50 tries
      // (not testing for exact number due to randomness)
      expect(results.size).toBeGreaterThan(1);
    });

    it('produces valid input for reciprocal pairs', () => {
      const players = createNumberedPlayers(8);
      const shuffled = shuffleForPairing(players);

      // Should still work with pairing functions
      const pairs = generateReciprocalPairs(shuffled);
      expect(pairs).toHaveLength(8);
    });

    it('produces valid input for circular chain', () => {
      const players = createNumberedPlayers(7);
      const shuffled = shuffleForPairing(players);

      const pairs = generateCircularChain(shuffled);
      expect(pairs).toHaveLength(7);
    });
  });

  describe('preserves object properties', () => {
    it('maintains all player object properties', () => {
      const players = [
        { id: 'p1', name: 'Player 1', handicap: 10 },
        { id: 'p2', name: 'Player 2', handicap: 15 },
        { id: 'p3', name: 'Player 3', handicap: 20 },
      ];

      const shuffled = shuffleForPairing(players);

      // Check all properties are preserved
      shuffled.forEach((player) => {
        const original = players.find((p) => p.id === player.id);
        expect(original).toBeDefined();
        expect(player.name).toBe(original!.name);
        expect(player.handicap).toBe(original!.handicap);
      });
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration: Complete Pairing Workflows', () => {
  describe('typical competition scenarios', () => {
    it('4-player group: auto-generates valid reciprocal pairs', () => {
      const players = createNumberedPlayers(4);
      const result = autoGenerateScoringPairs(players);
      const validation = validateScoringPairsCoverage(
        result.pairs,
        players.map((p) => p.id)
      );

      expect(result.type).toBe('reciprocal');
      expect(validation.isValid).toBe(true);
    });

    it('5-player group: auto-generates valid circular chain', () => {
      const players = createNumberedPlayers(5);
      const result = autoGenerateScoringPairs(players);
      const validation = validateScoringPairsCoverage(
        result.pairs,
        players.map((p) => p.id)
      );

      expect(result.type).toBe('circular');
      expect(validation.isValid).toBe(true);
    });

    it('12-player competition: shuffle + reciprocal', () => {
      const players = createNumberedPlayers(12);
      const shuffled = shuffleForPairing(players);
      const result = autoGenerateScoringPairs(shuffled);
      const validation = validateScoringPairsCoverage(
        result.pairs,
        players.map((p) => p.id)
      );

      expect(result.type).toBe('reciprocal');
      expect(validation.isValid).toBe(true);
      expect(result.pairs).toHaveLength(12);
    });

    it('11-player competition: shuffle + circular', () => {
      const players = createNumberedPlayers(11);
      const shuffled = shuffleForPairing(players);
      const result = autoGenerateScoringPairs(shuffled);
      const validation = validateScoringPairsCoverage(
        result.pairs,
        players.map((p) => p.id)
      );

      expect(result.type).toBe('circular');
      expect(validation.isValid).toBe(true);
    });
  });

  describe('team match scenarios', () => {
    it('4v4 team match: all players paired across teams', () => {
      const team1 = createPlayers(['A1', 'A2', 'A3', 'A4']);
      const team2 = createPlayers(['B1', 'B2', 'B3', 'B4']);
      const result = generateCrossTeamPairs(team1, team2);

      expect(result.pairs).toHaveLength(8);
      expect(result.metadata.hasUnevenTeams).toBe(false);

      // Validate coverage for all players
      const allIds = [...team1.map((p) => p.id), ...team2.map((p) => p.id)];
      const validation = validateScoringPairsCoverage(result.pairs, allIds);

      expect(validation.missingPlayers).toEqual([]);
    });

    it('5v3 team match with wrap: all players covered', () => {
      const team1 = createPlayers(['A1', 'A2', 'A3', 'A4', 'A5']);
      const team2 = createPlayers(['B1', 'B2', 'B3']);
      const result = generateCrossTeamPairs(team1, team2, 'wrap');

      const allIds = [...team1.map((p) => p.id), ...team2.map((p) => p.id)];
      const validation = validateScoringPairsCoverage(result.pairs, allIds);

      // All should be covered (some duplicates due to wrap)
      expect(validation.missingPlayers).toEqual([]);
    });
  });

  describe('edge case competitions', () => {
    it('2-player group: minimal valid pairing', () => {
      const players = createPlayers(['A', 'B']);
      const result = autoGenerateScoringPairs(players);

      expect(result.pairs).toHaveLength(2);
      expect(result.type).toBe('reciprocal');
    });

    it('3-player group: circular chain works', () => {
      const players = createPlayers(['A', 'B', 'C']);
      const result = autoGenerateScoringPairs(players);

      expect(result.pairs).toHaveLength(3);
      expect(result.type).toBe('circular');

      // Verify chain: A→B, B→C, C→A
      const aScores = result.pairs.find((p) => p.scorerId === 'A')?.playerId;
      const bScores = result.pairs.find((p) => p.scorerId === 'B')?.playerId;
      const cScores = result.pairs.find((p) => p.scorerId === 'C')?.playerId;

      expect(aScores).toBe('B');
      expect(bScores).toBe('C');
      expect(cScores).toBe('A');
    });

    it('large group (20 players): handles efficiently', () => {
      const players = createNumberedPlayers(20);
      const shuffled = shuffleForPairing(players);
      const result = autoGenerateScoringPairs(shuffled);

      expect(result.pairs).toHaveLength(20);
      expect(result.type).toBe('reciprocal');

      const validation = validateScoringPairsCoverage(
        result.pairs,
        players.map((p) => p.id)
      );
      expect(validation.isValid).toBe(true);
    });
  });
});
