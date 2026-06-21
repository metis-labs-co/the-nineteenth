/**
 * Skins Team Score Preparation Functions
 *
 * Functions for preparing team hole scores based on team format.
 */

import type { Hole } from '@/types/database';
import type {
  SkinsScoringType,
  SkinsHoleScoreData,
  SkinsTeamHoleScores,
  SkinsTeamHoleScoreData,
} from '@/types/database';
import type { TeamFormat } from '@/types/database/enums';
import { getStrokesReceived } from '../scoring';
import type { SkinsScorecardData } from './scores';

/**
 * Team info needed for team skins score preparation
 */
export interface SkinsTeamInfo {
  id: string;
  /** Member player IDs */
  member_ids: string[];
  /** Member details with handicaps (optional, populated for score calculation) */
  members?: { id: string; handicap: number | null }[];
}

/**
 * Prepare team hole scores for all teams on a specific hole.
 * Calculates team scores based on team format (best-ball, scramble, shamble).
 *
 * @param teams - Array of team info with member IDs and handicaps
 * @param scorecards - Map of player ID to their scorecard data
 * @param hole - Hole data with par and strokeIndex
 * @param holeNumber - The hole number (1-18)
 * @param teamFormat - The team format ('best-ball', 'scramble', 'shamble')
 * @returns SkinsTeamHoleScores record for database storage
 *
 * @example
 * const scores = prepareTeamHoleScores(
 *   [{ id: 't1', member_ids: ['p1', 'p2'], members: [...] }],
 *   { p1: { '1': { strokes: 5 } }, p2: { '1': { strokes: 4 } } },
 *   { par: 4, strokeIndex: 5 },
 *   1,
 *   'best-ball'
 * );
 */
export function prepareTeamHoleScores(
  teams: SkinsTeamInfo[],
  scorecards: Record<string, SkinsScorecardData>,
  hole: Pick<Hole, 'par' | 'strokeIndex'>,
  holeNumber: number,
  teamFormat: TeamFormat
): SkinsTeamHoleScores {
  const teamScores: SkinsTeamHoleScores = {};

  for (const team of teams) {
    // Calculate individual member scores first
    const memberScores: Record<string, SkinsHoleScoreData> = {};
    let bestNetScore = Infinity;
    let bestGrossScore = Infinity;
    let contributingPlayerId: string | undefined;

    for (const memberId of team.member_ids) {
      const scorecard = scorecards[memberId];
      if (!scorecard) continue;

      const holeData = scorecard[String(holeNumber)];
      if (holeData === undefined) continue;

      const gross = typeof holeData === 'number' ? holeData : holeData.strokes;

      // Find member handicap
      const member = team.members?.find((m) => m.id === memberId);
      const handicap = member?.handicap ?? 0;
      const strokesReceived = getStrokesReceived(handicap, hole.strokeIndex);
      const net = gross - strokesReceived;

      memberScores[memberId] = {
        gross,
        net,
        strokes_received: strokesReceived,
      };

      // Track best scores for team calculation
      if (net < bestNetScore) {
        bestNetScore = net;
        contributingPlayerId = memberId;
      }
      if (gross < bestGrossScore) {
        bestGrossScore = gross;
      }
    }

    // Skip if no member scores
    if (Object.keys(memberScores).length === 0) continue;

    // Calculate team score based on format
    let teamScore: number;

    switch (teamFormat) {
      case 'best-ball':
      case 'shamble':
        // Best individual net score
        teamScore = bestNetScore;
        break;
      case 'scramble':
      case 'alt-shot':
        // For scramble/alt-shot, one ball is played per team.
        // Use the best gross score as the team score (all players share the same ball).
        teamScore = bestGrossScore;
        contributingPlayerId = undefined; // All contribute equally
        break;
      default:
        // For other formats (aggregate, match-play-team), use best net
        teamScore = bestNetScore;
    }

    teamScores[team.id] = {
      team_score: teamScore,
      member_scores: memberScores,
      contributing_player_id: contributingPlayerId,
    };
  }

  return teamScores;
}

/**
 * Get the comparison score for a team based on format and scoring type.
 *
 * @param teamData - Team hole score data
 * @param teamFormat - Team format ('best-ball', 'scramble', 'shamble')
 * @param scoringType - 'gross' or 'net'
 * @returns The score to use for comparison
 */
export function getTeamScoreForFormat(
  teamData: SkinsTeamHoleScoreData,
  teamFormat: TeamFormat,
  scoringType: SkinsScoringType
): number {
  switch (teamFormat) {
    case 'scramble':
    case 'alt-shot':
      // Scramble/alt-shot: one ball per team, use the team_score (gross-based)
      return teamData.team_score;

    case 'best-ball':
    case 'shamble':
      // Best individual score - recalculate from member scores
      if (scoringType === 'gross') {
        return Math.min(
          ...Object.values(teamData.member_scores).map((s) => s.gross)
        );
      }
      // Net scoring - use pre-calculated team_score or find best net
      return Math.min(
        ...Object.values(teamData.member_scores).map((s) => s.net)
      );

    default:
      // Default to team_score
      return teamData.team_score;
  }
}
