/**
 * Skins Winner Determination Functions
 *
 * Functions for determining hole winners based on scores and scoring type.
 */

import type { SkinsScoringType, SkinsHoleScores } from '@/types/database';

/**
 * Result of determining a hole winner
 */
export interface HoleWinnerResult {
  /** Player ID of winner, null if carryover */
  winnerId: string | null;
  /** True if hole was tied (carryover) */
  isCarryover: boolean;
  /** The winning/tied score */
  minScore: number;
  /** Player IDs who tied for best score */
  tiedPlayerIds: string[];
}

/**
 * Determine the winner of a hole based on scores and scoring type.
 *
 * @param holeScores - Scores for all participants
 * @param scoringType - 'gross' or 'net'
 * @returns Winner result with winnerId (null if tie), isCarryover flag, and tied players
 *
 * @example
 * const result = determineHoleWinner(
 *   { p1: { gross: 4, net: 3, strokes_received: 1 }, p2: { gross: 4, net: 4, strokes_received: 0 } },
 *   'net'
 * );
 * // Returns: { winnerId: 'p1', isCarryover: false, minScore: 3, tiedPlayerIds: ['p1'] }
 */
export function determineHoleWinner(
  holeScores: SkinsHoleScores,
  scoringType: SkinsScoringType
): HoleWinnerResult {
  const playerIds = Object.keys(holeScores);

  if (playerIds.length === 0) {
    return {
      winnerId: null,
      isCarryover: true,
      minScore: 0,
      tiedPlayerIds: [],
    };
  }

  // Find the minimum score based on scoring type
  let minScore = Infinity;
  for (const playerId of playerIds) {
    const score = scoringType === 'gross'
      ? holeScores[playerId].gross
      : holeScores[playerId].net;
    if (score < minScore) {
      minScore = score;
    }
  }

  // Find all players with the minimum score
  const tiedPlayerIds = playerIds.filter((playerId) => {
    const score = scoringType === 'gross'
      ? holeScores[playerId].gross
      : holeScores[playerId].net;
    return score === minScore;
  });

  // If more than one player has the minimum score, it's a tie (carryover)
  const isCarryover = tiedPlayerIds.length > 1;
  const winnerId = isCarryover ? null : tiedPlayerIds[0];

  return {
    winnerId,
    isCarryover,
    minScore,
    tiedPlayerIds,
  };
}
