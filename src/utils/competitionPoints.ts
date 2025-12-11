import type { GameType } from '@/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Point allocation rules for competition standings
 */
export interface PointSystemRules {
  /** Points awarded by position (index 0 = 1st place, etc.) */
  positionPoints: number[];
  /** Default points for positions beyond the defined array */
  defaultPoints?: number;
  /** Match play specific point allocation */
  matchPlay?: {
    win: number;
    draw: number;
    loss: number;
  };
}

/**
 * Result from a single round that can be scored
 */
export interface RoundResult<TParticipant = string> {
  participantId: TParticipant;
  rawScore: number;
  /** Optional identifier for team-based results */
  teamId?: string;
}

/**
 * Result with position and competition points assigned
 */
export interface ScoredResult<TParticipant = string> extends RoundResult<TParticipant> {
  position: number;
  /** True if this position is tied with others */
  tied: boolean;
  competitionPoints: number;
}

/**
 * Match result for match play scoring
 */
export interface MatchResult<TParticipant = string> {
  participantId: TParticipant;
  opponentId: TParticipant;
  result: 'win' | 'draw' | 'loss';
  /** Optional margin of victory (e.g., "3&2") */
  margin?: string;
}

/**
 * Round results for aggregation
 */
export interface RoundResultsForAggregation<TParticipant = string> {
  roundId: string;
  results: ScoredResult<TParticipant>[];
}

/**
 * Aggregated standings entry
 */
export interface StandingsEntry<TParticipant = string> {
  participantId: TParticipant;
  totalPoints: number;
  roundsPlayed: number;
  /** Points breakdown by round */
  roundPoints: {
    roundId: string;
    points: number;
    position: number;
  }[];
  /** Current position in standings */
  position: number;
  /** True if tied with others at this position */
  tied: boolean;
}

// ============================================================================
// Default Point Systems
// ============================================================================

/**
 * Standard competition point system (1st = 10, 2nd = 8, etc.)
 */
export const STANDARD_POINT_SYSTEM: PointSystemRules = {
  positionPoints: [10, 8, 6, 5, 4, 3, 2, 1],
  defaultPoints: 1,
  matchPlay: {
    win: 2,
    draw: 1,
    loss: 0,
  },
};

/**
 * Golf league point system (rewards participation)
 */
export const LEAGUE_POINT_SYSTEM: PointSystemRules = {
  positionPoints: [25, 20, 18, 16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  defaultPoints: 1,
  matchPlay: {
    win: 3,
    draw: 1,
    loss: 0,
  },
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Calculate competition points for a set of round results.
 *
 * Sorts results by raw score (descending for Stableford, ascending for Stroke),
 * assigns positions with proper tie handling, and awards competition points
 * based on the provided point system.
 *
 * Tie handling: When players tie, they share the average of the positions
 * they would have occupied. For example, if two players tie for 1st, they
 * both receive the average of 1st and 2nd place points.
 *
 * @param results - Array of round results to score
 * @param gameType - The game type (affects sorting direction)
 * @param pointSystem - Point allocation rules
 * @returns Array of scored results with positions and competition points
 *
 * @example
 * ```typescript
 * const results: RoundResult[] = [
 *   { participantId: 'player1', rawScore: 38 },
 *   { participantId: 'player2', rawScore: 36 },
 *   { participantId: 'player3', rawScore: 36 },
 *   { participantId: 'player4', rawScore: 32 },
 * ];
 *
 * const scored = calculateCompetitionPoints(results, 'stableford', STANDARD_POINT_SYSTEM);
 * // player1: position 1, points 10 (1st place)
 * // player2: position 2, points 7, tied (avg of 8 + 6)
 * // player3: position 2, points 7, tied (avg of 8 + 6)
 * // player4: position 4, points 5 (4th place)
 * ```
 *
 * @example Unit test
 * ```typescript
 * describe('calculateCompetitionPoints', () => {
 *   it('sorts Stableford scores descending (higher is better)', () => {
 *     const results = [
 *       { participantId: 'p1', rawScore: 30 },
 *       { participantId: 'p2', rawScore: 40 },
 *     ];
 *
 *     const scored = calculateCompetitionPoints(results, 'stableford', STANDARD_POINT_SYSTEM);
 *
 *     expect(scored[0].participantId).toBe('p2');
 *     expect(scored[0].position).toBe(1);
 *     expect(scored[1].participantId).toBe('p1');
 *     expect(scored[1].position).toBe(2);
 *   });
 *
 *   it('sorts Stroke scores ascending (lower is better)', () => {
 *     const results = [
 *       { participantId: 'p1', rawScore: 72 },
 *       { participantId: 'p2', rawScore: 68 },
 *     ];
 *
 *     const scored = calculateCompetitionPoints(results, 'stroke', STANDARD_POINT_SYSTEM);
 *
 *     expect(scored[0].participantId).toBe('p2');
 *     expect(scored[0].position).toBe(1);
 *   });
 *
 *   it('handles ties with averaged points', () => {
 *     const results = [
 *       { participantId: 'p1', rawScore: 36 },
 *       { participantId: 'p2', rawScore: 36 },
 *     ];
 *
 *     const scored = calculateCompetitionPoints(results, 'stableford', STANDARD_POINT_SYSTEM);
 *
 *     // Both tie for 1st, share avg of positions 1 & 2 points (10 + 8) / 2 = 9
 *     expect(scored[0].position).toBe(1);
 *     expect(scored[0].tied).toBe(true);
 *     expect(scored[0].competitionPoints).toBe(9);
 *     expect(scored[1].competitionPoints).toBe(9);
 *   });
 *
 *   it('uses default points for positions beyond array', () => {
 *     const results = Array.from({ length: 20 }, (_, i) => ({
 *       participantId: `p${i}`,
 *       rawScore: 40 - i,
 *     }));
 *
 *     const scored = calculateCompetitionPoints(results, 'stableford', STANDARD_POINT_SYSTEM);
 *
 *     // Position 20 should get default points (1)
 *     const lastPlace = scored.find(s => s.position === 20);
 *     expect(lastPlace?.competitionPoints).toBe(1);
 *   });
 * });
 * ```
 */
export function calculateCompetitionPoints<TParticipant = string>(
  results: RoundResult<TParticipant>[],
  gameType: GameType,
  pointSystem: PointSystemRules
): ScoredResult<TParticipant>[] {
  if (results.length === 0) {
    return [];
  }

  // Sort results based on game type
  // Stableford: higher is better (descending)
  // Stroke: lower is better (ascending)
  const sortedResults = [...results].sort((a, b) => {
    if (gameType === 'stableford') {
      return b.rawScore - a.rawScore;
    }
    return a.rawScore - b.rawScore;
  });

  // Group results by score to handle ties
  const scoreGroups = groupByScore(sortedResults);

  const scoredResults: ScoredResult<TParticipant>[] = [];
  let currentPosition = 1;

  for (const group of scoreGroups) {
    const groupSize = group.length;
    const isTied = groupSize > 1;

    // Calculate average points for tied positions
    const positionsOccupied = Array.from(
      { length: groupSize },
      (_, i) => currentPosition + i
    );

    const totalPoints = positionsOccupied.reduce((sum, pos) => {
      return sum + getPointsForPosition(pos, pointSystem);
    }, 0);

    const averagePoints = Math.round(totalPoints / groupSize);

    // Assign same position and averaged points to all tied participants
    for (const result of group) {
      scoredResults.push({
        ...result,
        position: currentPosition,
        tied: isTied,
        competitionPoints: averagePoints,
      });
    }

    currentPosition += groupSize;
  }

  return scoredResults;
}

/**
 * Calculate match play competition points for a single match result.
 *
 * @param matchResult - The match result (win/draw/loss)
 * @param pointSystem - Point allocation rules with matchPlay config
 * @returns Competition points earned
 *
 * @example
 * ```typescript
 * const winPoints = calculateMatchPlayPoints(
 *   { participantId: 'p1', opponentId: 'p2', result: 'win' },
 *   STANDARD_POINT_SYSTEM
 * );
 * // winPoints = 2
 *
 * const drawPoints = calculateMatchPlayPoints(
 *   { participantId: 'p1', opponentId: 'p2', result: 'draw' },
 *   STANDARD_POINT_SYSTEM
 * );
 * // drawPoints = 1
 * ```
 *
 * @example Unit test
 * ```typescript
 * describe('calculateMatchPlayPoints', () => {
 *   it('returns win points for a win', () => {
 *     const result: MatchResult = {
 *       participantId: 'p1',
 *       opponentId: 'p2',
 *       result: 'win',
 *     };
 *
 *     const points = calculateMatchPlayPoints(result, STANDARD_POINT_SYSTEM);
 *
 *     expect(points).toBe(2);
 *   });
 *
 *   it('returns draw points for a draw', () => {
 *     const result: MatchResult = {
 *       participantId: 'p1',
 *       opponentId: 'p2',
 *       result: 'draw',
 *     };
 *
 *     const points = calculateMatchPlayPoints(result, STANDARD_POINT_SYSTEM);
 *
 *     expect(points).toBe(1);
 *   });
 *
 *   it('returns loss points for a loss', () => {
 *     const result: MatchResult = {
 *       participantId: 'p1',
 *       opponentId: 'p2',
 *       result: 'loss',
 *     };
 *
 *     const points = calculateMatchPlayPoints(result, STANDARD_POINT_SYSTEM);
 *
 *     expect(points).toBe(0);
 *   });
 *
 *   it('uses default values when matchPlay config missing', () => {
 *     const result: MatchResult = {
 *       participantId: 'p1',
 *       opponentId: 'p2',
 *       result: 'win',
 *     };
 *     const customSystem: PointSystemRules = {
 *       positionPoints: [10, 8, 6],
 *     };
 *
 *     const points = calculateMatchPlayPoints(result, customSystem);
 *
 *     expect(points).toBe(2); // Default win points
 *   });
 * });
 * ```
 */
export function calculateMatchPlayPoints<TParticipant = string>(
  matchResult: MatchResult<TParticipant>,
  pointSystem: PointSystemRules
): number {
  const matchPlayConfig = pointSystem.matchPlay ?? {
    win: 2,
    draw: 1,
    loss: 0,
  };

  switch (matchResult.result) {
    case 'win':
      return matchPlayConfig.win;
    case 'draw':
      return matchPlayConfig.draw;
    case 'loss':
      return matchPlayConfig.loss;
  }
}

/**
 * Aggregate competition standings across multiple rounds.
 *
 * Groups results by participant (player or team), sums competition points
 * across all rounds, and returns sorted standings with total points and
 * rounds played.
 *
 * @param roundResults - Array of round results with scored entries
 * @returns Sorted standings with aggregated points
 *
 * @example
 * ```typescript
 * const round1: RoundResultsForAggregation = {
 *   roundId: 'round-1',
 *   results: [
 *     { participantId: 'p1', rawScore: 38, position: 1, tied: false, competitionPoints: 10 },
 *     { participantId: 'p2', rawScore: 36, position: 2, tied: false, competitionPoints: 8 },
 *   ],
 * };
 *
 * const round2: RoundResultsForAggregation = {
 *   roundId: 'round-2',
 *   results: [
 *     { participantId: 'p1', rawScore: 34, position: 2, tied: false, competitionPoints: 8 },
 *     { participantId: 'p2', rawScore: 40, position: 1, tied: false, competitionPoints: 10 },
 *   ],
 * };
 *
 * const standings = aggregateCompetitionStandings([round1, round2]);
 * // Both players have 18 total points (10+8)
 * // Sorted by total points descending
 * ```
 *
 * @example Unit test
 * ```typescript
 * describe('aggregateCompetitionStandings', () => {
 *   it('aggregates points across rounds', () => {
 *     const round1: RoundResultsForAggregation = {
 *       roundId: 'r1',
 *       results: [
 *         { participantId: 'p1', rawScore: 38, position: 1, tied: false, competitionPoints: 10 },
 *         { participantId: 'p2', rawScore: 36, position: 2, tied: false, competitionPoints: 8 },
 *       ],
 *     };
 *
 *     const round2: RoundResultsForAggregation = {
 *       roundId: 'r2',
 *       results: [
 *         { participantId: 'p1', rawScore: 34, position: 2, tied: false, competitionPoints: 8 },
 *         { participantId: 'p2', rawScore: 40, position: 1, tied: false, competitionPoints: 10 },
 *       ],
 *     };
 *
 *     const standings = aggregateCompetitionStandings([round1, round2]);
 *
 *     expect(standings.length).toBe(2);
 *     expect(standings[0].totalPoints).toBe(18);
 *     expect(standings[0].roundsPlayed).toBe(2);
 *   });
 *
 *   it('handles participants with different round counts', () => {
 *     const round1: RoundResultsForAggregation = {
 *       roundId: 'r1',
 *       results: [
 *         { participantId: 'p1', rawScore: 38, position: 1, tied: false, competitionPoints: 10 },
 *         { participantId: 'p2', rawScore: 36, position: 2, tied: false, competitionPoints: 8 },
 *       ],
 *     };
 *
 *     const round2: RoundResultsForAggregation = {
 *       roundId: 'r2',
 *       results: [
 *         { participantId: 'p1', rawScore: 34, position: 1, tied: false, competitionPoints: 10 },
 *       ],
 *     };
 *
 *     const standings = aggregateCompetitionStandings([round1, round2]);
 *
 *     const p1 = standings.find(s => s.participantId === 'p1');
 *     const p2 = standings.find(s => s.participantId === 'p2');
 *
 *     expect(p1?.roundsPlayed).toBe(2);
 *     expect(p1?.totalPoints).toBe(20);
 *     expect(p2?.roundsPlayed).toBe(1);
 *     expect(p2?.totalPoints).toBe(8);
 *   });
 *
 *   it('handles ties in total points', () => {
 *     const round1: RoundResultsForAggregation = {
 *       roundId: 'r1',
 *       results: [
 *         { participantId: 'p1', rawScore: 38, position: 1, tied: false, competitionPoints: 10 },
 *         { participantId: 'p2', rawScore: 36, position: 2, tied: false, competitionPoints: 10 },
 *       ],
 *     };
 *
 *     const standings = aggregateCompetitionStandings([round1]);
 *
 *     expect(standings[0].position).toBe(1);
 *     expect(standings[0].tied).toBe(true);
 *     expect(standings[1].position).toBe(1);
 *     expect(standings[1].tied).toBe(true);
 *   });
 *
 *   it('returns empty array for no results', () => {
 *     const standings = aggregateCompetitionStandings([]);
 *
 *     expect(standings).toEqual([]);
 *   });
 *
 *   it('tracks round points breakdown', () => {
 *     const round1: RoundResultsForAggregation = {
 *       roundId: 'r1',
 *       results: [
 *         { participantId: 'p1', rawScore: 38, position: 1, tied: false, competitionPoints: 10 },
 *       ],
 *     };
 *
 *     const standings = aggregateCompetitionStandings([round1]);
 *
 *     expect(standings[0].roundPoints).toEqual([
 *       { roundId: 'r1', points: 10, position: 1 },
 *     ]);
 *   });
 * });
 * ```
 */
export function aggregateCompetitionStandings<TParticipant = string>(
  roundResults: RoundResultsForAggregation<TParticipant>[]
): StandingsEntry<TParticipant>[] {
  if (roundResults.length === 0) {
    return [];
  }

  // Aggregate points by participant
  const participantMap = new Map<
    TParticipant,
    {
      totalPoints: number;
      roundsPlayed: number;
      roundPoints: { roundId: string; points: number; position: number }[];
    }
  >();

  for (const round of roundResults) {
    for (const result of round.results) {
      const existing = participantMap.get(result.participantId);

      if (existing) {
        existing.totalPoints += result.competitionPoints;
        existing.roundsPlayed += 1;
        existing.roundPoints.push({
          roundId: round.roundId,
          points: result.competitionPoints,
          position: result.position,
        });
      } else {
        participantMap.set(result.participantId, {
          totalPoints: result.competitionPoints,
          roundsPlayed: 1,
          roundPoints: [
            {
              roundId: round.roundId,
              points: result.competitionPoints,
              position: result.position,
            },
          ],
        });
      }
    }
  }

  // Convert to array and sort by total points descending
  const entries = Array.from(participantMap.entries()).map(
    ([participantId, data]) => ({
      participantId,
      ...data,
      position: 0,
      tied: false,
    })
  );

  entries.sort((a, b) => b.totalPoints - a.totalPoints);

  // Assign positions with tie handling
  const standingsWithPositions = assignPositions(entries, 'totalPoints');

  return standingsWithPositions;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get points for a specific position from the point system
 */
function getPointsForPosition(position: number, pointSystem: PointSystemRules): number {
  const index = position - 1;
  if (index < pointSystem.positionPoints.length) {
    return pointSystem.positionPoints[index];
  }
  return pointSystem.defaultPoints ?? 0;
}

/**
 * Group results by raw score for tie detection
 */
function groupByScore<T extends { rawScore: number }>(sortedResults: T[]): T[][] {
  const groups: T[][] = [];
  let currentGroup: T[] = [];
  let currentScore: number | null = null;

  for (const result of sortedResults) {
    if (currentScore === null || result.rawScore === currentScore) {
      currentGroup.push(result);
      currentScore = result.rawScore;
    } else {
      groups.push(currentGroup);
      currentGroup = [result];
      currentScore = result.rawScore;
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Assign positions with tie handling to a sorted array
 */
function assignPositions<T extends { position: number; tied: boolean }>(
  sortedEntries: T[],
  scoreKey: keyof T
): T[] {
  if (sortedEntries.length === 0) {
    return [];
  }

  const result: T[] = [];
  let currentPosition = 1;
  let i = 0;

  while (i < sortedEntries.length) {
    // Find all entries with the same score
    const currentScore = sortedEntries[i][scoreKey];
    const tiedEntries: T[] = [];

    while (
      i < sortedEntries.length &&
      sortedEntries[i][scoreKey] === currentScore
    ) {
      tiedEntries.push(sortedEntries[i]);
      i++;
    }

    const isTied = tiedEntries.length > 1;

    // Assign same position to all tied entries
    for (const entry of tiedEntries) {
      result.push({
        ...entry,
        position: currentPosition,
        tied: isTied,
      });
    }

    currentPosition += tiedEntries.length;
  }

  return result;
}
