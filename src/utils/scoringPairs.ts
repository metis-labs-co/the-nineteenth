/**
 * Scoring Pairs Utilities
 *
 * Functions for generating and validating scoring pairs in golf competitions.
 * Scoring pairs define who scores (marks) whose scorecard during a round.
 *
 * Patterns:
 * - Reciprocal: Players score each other (A↔B) - best for even numbers
 * - Circular: Chain where each scores the next (A→B→C→A) - works for any count
 * - Cross-Team: Players from opposing teams score each other
 */

import type { ScoringPairCreateInput, AutoPairResult } from '@/types';

// Type for player input - accepts full Player objects or just { id: string }
type PlayerInput = { id: string };

/**
 * Strategy for handling uneven team sizes in cross-team pairing
 */
export type CrossTeamPairingStrategy = 'wrap' | 'partial';

/**
 * Metadata about how uneven teams were handled
 */
export interface UnevenTeamMetadata {
  /** Whether teams had different sizes */
  hasUnevenTeams: boolean;
  /** Size of team 1 */
  team1Size: number;
  /** Size of team 2 */
  team2Size: number;
  /** The strategy used to handle uneven teams */
  strategyUsed: CrossTeamPairingStrategy;
  /** Player IDs from the smaller team that were reused (wrap strategy) */
  reusedPlayerIds: string[];
  /** Player IDs from the larger team left unassigned (partial strategy) */
  unassignedPlayerIds: string[];
  /** Number of extra pairings created due to wrapping */
  extraPairingsCount: number;
}

/**
 * Result of cross-team pair generation including metadata
 */
export interface CrossTeamPairResult {
  /** Generated scoring pairs */
  pairs: ScoringPairCreateInput[];
  /** Metadata about how uneven teams were handled */
  metadata: UnevenTeamMetadata;
}

/**
 * Validation result for scoring pairs coverage check
 */
export interface ScoringPairsCoverageResult {
  /** Whether all players are covered exactly once as scorer and once as player */
  isValid: boolean;
  /** Player IDs that are not being scored by anyone */
  missingPlayers: string[];
  /** Player IDs that have multiple scorers */
  duplicatePlayers: string[];
  /** Player IDs that are not scoring anyone */
  missingScorers: string[];
  /** Player IDs that are scoring multiple players (only invalid in reciprocal mode) */
  duplicateScorers: string[];
}

/**
 * Generates reciprocal scoring pairs where players score each other.
 * For each pair (A, B), creates two entries: A→B and B→A.
 *
 * @param players - Array of players (must be even number, minimum 2)
 * @returns Array of scoring pair inputs
 * @throws Error if player count is odd or less than 2
 *
 * @example
 * // 4 players: A, B, C, D
 * const pairs = generateReciprocalPairs([
 *   { id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }
 * ]);
 * // Result: [
 * //   { scorerId: 'A', playerId: 'B' },  // A scores B
 * //   { scorerId: 'B', playerId: 'A' },  // B scores A
 * //   { scorerId: 'C', playerId: 'D' },  // C scores D
 * //   { scorerId: 'D', playerId: 'C' },  // D scores C
 * // ]
 */
export function generateReciprocalPairs(
  players: PlayerInput[]
): ScoringPairCreateInput[] {
  if (players.length < 2) {
    throw new Error('At least 2 players are required for reciprocal pairs');
  }

  if (players.length % 2 !== 0) {
    throw new Error(
      `Reciprocal pairs require an even number of players. Got ${players.length} players.`
    );
  }

  const pairs: ScoringPairCreateInput[] = [];

  // Pair adjacent players: (0,1), (2,3), (4,5), etc.
  for (let i = 0; i < players.length; i += 2) {
    const playerA = players[i];
    const playerB = players[i + 1];

    // A scores B
    pairs.push({
      scorerId: playerA.id,
      playerId: playerB.id,
    });

    // B scores A
    pairs.push({
      scorerId: playerB.id,
      playerId: playerA.id,
    });
  }

  return pairs;
}

/**
 * Generates a circular chain of scoring pairs.
 * Each player scores the next player in the list, and the last player scores the first.
 *
 * @param players - Array of players (minimum 2)
 * @returns Array of scoring pair inputs forming a complete chain
 * @throws Error if less than 2 players
 *
 * @example
 * // 3 players: A, B, C (odd number - can't use reciprocal)
 * const pairs = generateCircularChain([
 *   { id: 'A' }, { id: 'B' }, { id: 'C' }
 * ]);
 * // Result: [
 * //   { scorerId: 'A', playerId: 'B' },  // A scores B
 * //   { scorerId: 'B', playerId: 'C' },  // B scores C
 * //   { scorerId: 'C', playerId: 'A' },  // C scores A (chain completes)
 * // ]
 *
 * @example
 * // 5 players: A, B, C, D, E
 * const pairs = generateCircularChain([
 *   { id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }, { id: 'E' }
 * ]);
 * // Result: A→B→C→D→E→A (5 pairs forming a complete circle)
 */
export function generateCircularChain(
  players: PlayerInput[]
): ScoringPairCreateInput[] {
  if (players.length < 2) {
    throw new Error('At least 2 players are required for circular chain');
  }

  const pairs: ScoringPairCreateInput[] = [];

  for (let i = 0; i < players.length; i++) {
    const scorer = players[i];
    // Next player in chain, wrapping to first for last player
    const playerToScore = players[(i + 1) % players.length];

    pairs.push({
      scorerId: scorer.id,
      playerId: playerToScore.id,
    });
  }

  return pairs;
}

/**
 * Automatically generates scoring pairs using the optimal strategy.
 * - Even number of players: Uses reciprocal pairs (A↔B)
 * - Odd number of players: Uses circular chain (A→B→C→A)
 *
 * @param players - Array of players (minimum 2)
 * @returns Object with pairs array and the type of pairing used
 * @throws Error if less than 2 players
 *
 * @example
 * // Even count - uses reciprocal
 * const result = autoGenerateScoringPairs([
 *   { id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }
 * ]);
 * // result.type === 'reciprocal'
 * // result.pairs: A↔B, C↔D
 *
 * @example
 * // Odd count - uses circular
 * const result = autoGenerateScoringPairs([
 *   { id: 'A' }, { id: 'B' }, { id: 'C' }
 * ]);
 * // result.type === 'circular'
 * // result.pairs: A→B→C→A
 */
export function autoGenerateScoringPairs(
  players: PlayerInput[]
): AutoPairResult {
  if (players.length < 2) {
    throw new Error('At least 2 players are required for auto-pairing');
  }

  const isEven = players.length % 2 === 0;

  if (isEven) {
    return {
      pairs: generateReciprocalPairs(players),
      type: 'reciprocal',
    };
  } else {
    return {
      pairs: generateCircularChain(players),
      type: 'circular',
    };
  }
}

/**
 * Generates cross-team scoring pairs where players from opposing teams score each other.
 * Team1[0] ↔ Team2[0], Team1[1] ↔ Team2[1], etc.
 *
 * Handles uneven teams based on strategy:
 * - 'wrap' (default): Smaller team players are reused to pair with all larger team players
 * - 'partial': Only pairs up to the smaller team size, leaving excess players unassigned
 *
 * @param team1Players - Players from the first team
 * @param team2Players - Players from the second team
 * @param strategy - How to handle uneven teams: 'wrap' (default) or 'partial'
 * @returns Object with pairs array and metadata about uneven handling
 * @throws Error if either team is empty
 *
 * @example
 * // Even teams: 2v2
 * const result = generateCrossTeamPairs(
 *   [{ id: 'A1' }, { id: 'A2' }],
 *   [{ id: 'B1' }, { id: 'B2' }]
 * );
 * // result.pairs: [
 * //   { scorerId: 'A1', playerId: 'B1' },
 * //   { scorerId: 'B1', playerId: 'A1' },
 * //   { scorerId: 'A2', playerId: 'B2' },
 * //   { scorerId: 'B2', playerId: 'A2' },
 * // ]
 * // result.metadata.hasUnevenTeams: false
 *
 * @example
 * // Uneven teams: 4v3 with 'wrap' strategy (default)
 * const result = generateCrossTeamPairs(
 *   [{ id: 'A1' }, { id: 'A2' }, { id: 'A3' }, { id: 'A4' }],
 *   [{ id: 'B1' }, { id: 'B2' }, { id: 'B3' }],
 *   'wrap'
 * );
 * // Team1[3] (A4) pairs with Team2[0] (B1) - wrapping around
 * // result.metadata.reusedPlayerIds: ['B1']
 * // result.metadata.extraPairingsCount: 1
 *
 * @example
 * // Uneven teams: 4v3 with 'partial' strategy
 * const result = generateCrossTeamPairs(
 *   [{ id: 'A1' }, { id: 'A2' }, { id: 'A3' }, { id: 'A4' }],
 *   [{ id: 'B1' }, { id: 'B2' }, { id: 'B3' }],
 *   'partial'
 * );
 * // Only 3 pairings created, A4 is unassigned
 * // result.metadata.unassignedPlayerIds: ['A4']
 */
export function generateCrossTeamPairs(
  team1Players: PlayerInput[],
  team2Players: PlayerInput[],
  strategy: CrossTeamPairingStrategy = 'wrap'
): CrossTeamPairResult {
  if (team1Players.length === 0) {
    throw new Error('Team 1 must have at least one player');
  }

  if (team2Players.length === 0) {
    throw new Error('Team 2 must have at least one player');
  }

  const pairs: ScoringPairCreateInput[] = [];
  const team1Size = team1Players.length;
  const team2Size = team2Players.length;
  const hasUnevenTeams = team1Size !== team2Size;
  const minLength = Math.min(team1Size, team2Size);
  const maxLength = Math.max(team1Size, team2Size);

  // Track metadata
  const reusedPlayerIds: string[] = [];
  const unassignedPlayerIds: string[] = [];
  let extraPairingsCount = 0;

  // Determine iteration count based on strategy
  const iterationCount = strategy === 'wrap' ? maxLength : minLength;

  for (let i = 0; i < iterationCount; i++) {
    const team1Index = i % team1Size;
    const team2Index = i % team2Size;
    const team1Player = team1Players[team1Index];
    const team2Player = team2Players[team2Index];

    // Track reused players (when index wraps around)
    if (strategy === 'wrap' && i >= minLength) {
      extraPairingsCount++;
      // The player from the smaller team is being reused
      if (team1Size < team2Size && !reusedPlayerIds.includes(team1Player.id)) {
        reusedPlayerIds.push(team1Player.id);
      } else if (team2Size < team1Size && !reusedPlayerIds.includes(team2Player.id)) {
        reusedPlayerIds.push(team2Player.id);
      }
    }

    // Team1 player scores Team2 player
    pairs.push({
      scorerId: team1Player.id,
      playerId: team2Player.id,
    });

    // Team2 player scores Team1 player
    pairs.push({
      scorerId: team2Player.id,
      playerId: team1Player.id,
    });
  }

  // Track unassigned players for partial strategy
  if (strategy === 'partial' && hasUnevenTeams) {
    if (team1Size > team2Size) {
      for (let i = minLength; i < team1Size; i++) {
        unassignedPlayerIds.push(team1Players[i].id);
      }
    } else {
      for (let i = minLength; i < team2Size; i++) {
        unassignedPlayerIds.push(team2Players[i].id);
      }
    }
  }

  return {
    pairs,
    metadata: {
      hasUnevenTeams,
      team1Size,
      team2Size,
      strategyUsed: strategy,
      reusedPlayerIds,
      unassignedPlayerIds,
      extraPairingsCount,
    },
  };
}

/**
 * Validates that scoring pairs provide complete coverage for all players.
 * Checks that every player is scored by exactly one scorer.
 *
 * @param pairs - Array of scoring pairs to validate
 * @param playerIds - Array of all player IDs that should be covered
 * @returns Validation result with details about any coverage issues
 *
 * @example
 * // Valid coverage
 * const result = validateScoringPairsCoverage(
 *   [
 *     { scorerId: 'A', playerId: 'B' },
 *     { scorerId: 'B', playerId: 'A' },
 *   ],
 *   ['A', 'B']
 * );
 * // result.isValid === true
 * // result.missingPlayers === []
 * // result.duplicatePlayers === []
 *
 * @example
 * // Missing player - C has no scorer
 * const result = validateScoringPairsCoverage(
 *   [
 *     { scorerId: 'A', playerId: 'B' },
 *     { scorerId: 'B', playerId: 'A' },
 *   ],
 *   ['A', 'B', 'C']
 * );
 * // result.isValid === false
 * // result.missingPlayers === ['C']
 *
 * @example
 * // Duplicate - B is scored by both A and C
 * const result = validateScoringPairsCoverage(
 *   [
 *     { scorerId: 'A', playerId: 'B' },
 *     { scorerId: 'C', playerId: 'B' },
 *   ],
 *   ['A', 'B', 'C']
 * );
 * // result.isValid === false
 * // result.duplicatePlayers === ['B']
 * // result.missingPlayers === ['A', 'C']
 */
export function validateScoringPairsCoverage(
  pairs: ScoringPairCreateInput[],
  playerIds: string[]
): ScoringPairsCoverageResult {
  const playerIdSet = new Set(playerIds);

  // Track how many times each player is being scored
  const playersBeingScored: Map<string, number> = new Map();

  // Track how many times each player is scoring
  const playersScoring: Map<string, number> = new Map();

  // Initialize counts to 0
  for (const playerId of playerIds) {
    playersBeingScored.set(playerId, 0);
    playersScoring.set(playerId, 0);
  }

  // Count occurrences
  for (const pair of pairs) {
    // Only count if the player is in our expected list
    if (playerIdSet.has(pair.playerId)) {
      const currentCount = playersBeingScored.get(pair.playerId) || 0;
      playersBeingScored.set(pair.playerId, currentCount + 1);
    }

    if (playerIdSet.has(pair.scorerId)) {
      const currentCount = playersScoring.get(pair.scorerId) || 0;
      playersScoring.set(pair.scorerId, currentCount + 1);
    }
  }

  // Find issues
  const missingPlayers: string[] = [];
  const duplicatePlayers: string[] = [];
  const missingScorers: string[] = [];
  const duplicateScorers: string[] = [];

  for (const playerId of playerIds) {
    const scoredCount = playersBeingScored.get(playerId) || 0;
    const scoringCount = playersScoring.get(playerId) || 0;

    // Check if player is being scored
    if (scoredCount === 0) {
      missingPlayers.push(playerId);
    } else if (scoredCount > 1) {
      duplicatePlayers.push(playerId);
    }

    // Check if player is scoring someone
    if (scoringCount === 0) {
      missingScorers.push(playerId);
    } else if (scoringCount > 1) {
      duplicateScorers.push(playerId);
    }
  }

  // Valid if everyone is scored exactly once
  // Note: duplicateScorers is informational - in circular chains, everyone scores exactly once,
  // but in cross-team scenarios, some may score multiple
  const isValid = missingPlayers.length === 0 && duplicatePlayers.length === 0;

  return {
    isValid,
    missingPlayers,
    duplicatePlayers,
    missingScorers,
    duplicateScorers,
  };
}

/**
 * Shuffles players for pairing using Fisher-Yates algorithm.
 * Use before generating pairs to randomize matchups.
 *
 * @param players - Array of players to shuffle
 * @returns New shuffled array (original not modified)
 *
 * @example
 * const players = [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }];
 * const shuffled = shuffleForPairing(players);
 * const pairs = generateReciprocalPairs(shuffled);
 */
export function shuffleForPairing<T extends PlayerInput>(players: T[]): T[] {
  const shuffled = [...players];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}
