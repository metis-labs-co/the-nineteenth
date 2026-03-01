/**
 * Skins Team Winner Determination Functions
 *
 * Functions for determining team hole winners based on team scores and format.
 */

import type {
  SkinsScoringType,
  SkinsTeamHoleScores,
} from '@/types/database';
import type { TeamHoleWinnerResult } from '@/types/database/skins.types';
import type { TeamFormat } from '@/types/database/enums';
import { getTeamScoreForFormat } from './teamScores';

/**
 * Determine the winning team for a hole based on team scores and format.
 * Ties always result in carryover (no tie-breakers).
 *
 * @param teamScores - Scores for all teams
 * @param teamFormat - Team format ('best-ball', 'scramble', 'shamble')
 * @param scoringType - 'gross' or 'net'
 * @returns Winner result with winnerTeamId (null if tie), isCarryover flag, and tied teams
 *
 * @example
 * const result = determineTeamHoleWinner(
 *   { t1: { team_score: 3, member_scores: {...} }, t2: { team_score: 4, member_scores: {...} } },
 *   'best-ball',
 *   'net'
 * );
 * // Returns: { winnerTeamId: 't1', isCarryover: false, minScore: 3, tiedTeamIds: ['t1'] }
 */
export function determineTeamHoleWinner(
  teamScores: SkinsTeamHoleScores,
  teamFormat: TeamFormat,
  scoringType: SkinsScoringType
): TeamHoleWinnerResult {
  const teamIds = Object.keys(teamScores);

  if (teamIds.length === 0) {
    return {
      winnerTeamId: null,
      isCarryover: true,
      minScore: 0,
      tiedTeamIds: [],
    };
  }

  // Find the minimum score based on format and scoring type
  let minScore = Infinity;
  for (const teamId of teamIds) {
    const score = getTeamScoreForFormat(
      teamScores[teamId],
      teamFormat,
      scoringType
    );
    if (score < minScore) {
      minScore = score;
    }
  }

  // Find all teams with the minimum score
  const tiedTeamIds = teamIds.filter((teamId) => {
    const score = getTeamScoreForFormat(
      teamScores[teamId],
      teamFormat,
      scoringType
    );
    return score === minScore;
  });

  // If more than one team has the minimum score, it's a tie (carryover)
  const isCarryover = tiedTeamIds.length > 1;
  const winnerTeamId = isCarryover ? null : tiedTeamIds[0];

  return {
    winnerTeamId,
    isCarryover,
    minScore,
    tiedTeamIds,
  };
}
