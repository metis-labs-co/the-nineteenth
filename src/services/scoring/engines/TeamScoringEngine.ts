/**
 * Team Scoring Engine
 *
 * Per-scorecard scoring for team-format game types (best-ball, scramble,
 * aggregate, shamble). Used by the orchestrator's individual `calculateScore`
 * and `calculateLeaderboard` paths to score each team member's contribution.
 *
 * Round-total team aggregation (the actual "team's combined score") lives
 * elsewhere — see `src/utils/teamScoring/` and `src/services/rounds/
 * resultsEngine.ts`.
 */

import type { IScoringEngine } from './IScoringEngine';
import type {
  ScoringResult,
  LeaderboardEntry,
  ScorecardWithHandicap,
  CourseHoleData,
  EngineConfig,
  HoleScore,
} from '../types';
import { DEFAULT_ENGINE_CONFIG, getStablefordPoints } from '../types';
import type { GameType } from '@/types/database';
import {
  getPlayingHandicap,
  calculateStrokesForHole,
} from '../utils/handicapUtils';
import { calculateNetScore, getNetToPar } from '../utils/netScoreUtils';
import { sortByScore, assignPositions } from '../utils/leaderboardUtils';

/**
 * Team format type
 * Matches database team_format enum + shamble for future use
 */
export type TeamFormat = 'best-ball' | 'scramble' | 'aggregate' | 'match-play-team' | 'shamble' | 'alt-shot';

/**
 * Team scoring engine for multi-player team formats.
 *
 * Supports:
 * - Best Ball: Use the best net score from any team member on each hole
 * - Ambrose: All players contribute to one team score with combined handicap
 * - Aggregate: Sum all team members' individual scores
 */
export class TeamScoringEngine implements IScoringEngine {
  readonly gameType = 'best-ball'; // Primary format
  readonly higherIsBetter: boolean;

  private readonly teamFormat: TeamFormat;

  constructor(format: TeamFormat = 'best-ball') {
    this.teamFormat = format;
    // Best ball and Shamble use Stableford (higher is better), others use stroke (lower is better)
    this.higherIsBetter = format === 'best-ball' || format === 'shamble';
  }

  /**
   * Calculate team score from a single scorecard
   *
   * Note: This is for individual scorecard within a team context.
   * For full team scoring, use calculateTeamScore with all team scorecards.
   */
  calculateScore(
    { scorecard, handicap }: ScorecardWithHandicap,
    courseData: CourseHoleData,
    config: EngineConfig = DEFAULT_ENGINE_CONFIG
  ): ScoringResult {
    // For a single scorecard, calculate individual contribution
    const playingHandicap = config.useHandicap
      ? getPlayingHandicap(
          handicap,
          courseData.slopeRating,
          courseData.courseRating,
          courseData.par,
          this.teamFormat as GameType
        )
      : 0;

    const scores = this.parseScores(scorecard.scores);
    const holeMap = new Map(courseData.holes.map((h) => [h.number, h]));

    let totalGross = 0;
    let totalNet = 0;
    let totalPoints = 0;

    for (const score of scores) {
      const hole = holeMap.get(score.holeNumber);
      if (!hole || score.strokes === null || score.strokes === undefined) {
        continue;
      }

      const gross = score.strokes;
      totalGross += gross;

      const strokesReceived = calculateStrokesForHole(
        playingHandicap,
        hole.strokeIndex
      );
      const net = calculateNetScore(gross, strokesReceived);
      totalNet += net;

      // Stableford points for best ball
      const netToPar = getNetToPar(net, hole.par);
      totalPoints += getStablefordPoints(netToPar);
    }

    return {
      rawScore: this.higherIsBetter ? totalPoints : totalNet,
      resultData: {
        team_score: this.higherIsBetter ? totalPoints : totalNet,
        gross_score: totalGross,
        net_score: totalNet,
      },
      grossScore: totalGross,
      netScore: totalNet,
      stablefordPoints: totalPoints,
    };
  }

  /**
   * Calculate leaderboard from team scorecards
   *
   * Note: Each entry should be a team's combined scorecard.
   */
  calculateLeaderboard(
    scorecards: ScorecardWithHandicap[],
    courseData: CourseHoleData,
    config: EngineConfig = DEFAULT_ENGINE_CONFIG
  ): LeaderboardEntry[] {
    if (scorecards.length === 0) {
      return [];
    }

    const entries: LeaderboardEntry[] = scorecards.map((sc) => {
      const result = this.calculateScore(sc, courseData, config);
      return {
        participantId: sc.teamId || sc.scorecard.player_id,
        teamId: sc.teamId,
        rawScore: result.rawScore,
        position: 0,
        tied: false,
        competitionPoints: 0,
        resultData: result.resultData,
        isTeamResult: true,
      };
    });

    const sorted = sortByScore(entries, { higherIsBetter: this.higherIsBetter });
    return assignPositions(sorted);
  }

  /**
   * Parse scores from scorecard JSON
   */
  private parseScores(scores: Record<string, unknown> | null): HoleScore[] {
    if (!scores) {
      return [];
    }

    const result: HoleScore[] = [];

    for (const [key, value] of Object.entries(scores)) {
      const holeNumber = parseInt(key, 10);
      if (isNaN(holeNumber) || holeNumber < 1 || holeNumber > 18) {
        continue;
      }

      if (typeof value === 'number') {
        result.push({
          holeNumber,
          strokes: value,
        });
      } else if (typeof value === 'object' && value !== null) {
        const scoreObj = value as Record<string, unknown>;
        const strokes = scoreObj.strokes ?? scoreObj.score;
        if (typeof strokes === 'number') {
          result.push({
            holeNumber,
            strokes,
          });
        }
      }
    }

    return result;
  }
}

/**
 * Create a new Team Scoring engine instance
 */
export function createTeamScoringEngine(
  format: TeamFormat = 'best-ball'
): TeamScoringEngine {
  return new TeamScoringEngine(format);
}
