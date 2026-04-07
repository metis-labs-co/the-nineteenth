import type { GameType } from '@/types';
import type {
  PointSystemRules,
  RoundResult,
  ScoredResult,
  MatchResult,
} from './pointSystems';

// ============================================================================
// Core Calculation Functions
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
  // Stableford & Par: higher is better (descending)
  // Stroke: lower is better (ascending)
  const sortedResults = [...results].sort((a, b) => {
    if (gameType === 'stableford' || gameType === 'par') {
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get points for a specific position from the point system
 */
export function getPointsForPosition(position: number, pointSystem: PointSystemRules): number {
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
