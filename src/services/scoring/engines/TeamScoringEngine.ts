/**
 * Team Scoring Engine
 *
 * Implements team scoring for various formats:
 * - Best Ball: Best score from team members on each hole
 * - Scramble (formerly Ambrose): One ball played, team handicap applied
 * - Aggregate: Sum of all team member scores
 * - Shamble: Best drive, then individual play - sum all Stableford points
 */

import type { IScoringEngine } from './IScoringEngine';
import type {
  ScoringResult,
  LeaderboardEntry,
  ScorecardWithHandicap,
  CourseHoleData,
  EngineConfig,
  TeamScoringResult,
  HoleScore,
} from '../types';
import { DEFAULT_ENGINE_CONFIG, getStablefordPoints } from '../types';
import type { GameType } from '@/types/database';
import {
  getPlayingHandicap,
  calculateStrokesForHole,
  calculateAmbroseHandicap,
} from '../utils/handicapUtils';
import { calculateNetScore, getNetToPar } from '../utils/netScoreUtils';
import { sortByScore, assignPositions } from '../utils/leaderboardUtils';

/**
 * Team format type
 * Matches database team_format enum + shamble for future use
 */
export type TeamFormat = 'best-ball' | 'scramble' | 'aggregate' | 'match-play-team' | 'shamble';

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
   * Calculate Best Ball score from multiple team member scorecards
   */
  calculateBestBall(
    teamScores: ScorecardWithHandicap[],
    courseData: CourseHoleData,
    config: EngineConfig = DEFAULT_ENGINE_CONFIG
  ): TeamScoringResult {
    const holeMap = new Map(courseData.holes.map((h) => [h.number, h]));

    // Get playing handicaps for each team member
    const memberData = teamScores.map((sc) => ({
      playerId: sc.scorecard.player_id,
      handicap: config.useHandicap
        ? getPlayingHandicap(
            sc.handicap,
            courseData.slopeRating,
            courseData.courseRating,
            courseData.par,
            'best-ball'
          )
        : 0,
      scores: this.parseScores(sc.scorecard.scores),
    }));

    let totalPoints = 0;
    let totalGross = 0;
    let totalNet = 0;
    const memberContributions = new Map<
      string,
      { contribution: number; holeContributions: Record<number, boolean> }
    >();

    // Initialize contributions
    for (const member of memberData) {
      memberContributions.set(member.playerId, {
        contribution: 0,
        holeContributions: {},
      });
    }

    // Find best score on each hole
    for (let holeNum = 1; holeNum <= 18; holeNum++) {
      const hole = holeMap.get(holeNum);
      if (!hole) continue;

      let bestPoints = 0;
      let bestNet = Infinity;
      let bestPlayerId: string | null = null;
      let usedGross = 0;

      for (const member of memberData) {
        const score = member.scores.find((s) => s.holeNumber === holeNum);
        if (!score || score.strokes === null || score.strokes === undefined) {
          continue;
        }

        const gross = score.strokes;
        const strokesReceived = calculateStrokesForHole(
          member.handicap,
          hole.strokeIndex
        );
        const net = calculateNetScore(gross, strokesReceived);
        const netToPar = getNetToPar(net, hole.par);
        const points = getStablefordPoints(netToPar);

        // Use best points (or lowest net if tied on points)
        if (points > bestPoints || (points === bestPoints && net < bestNet)) {
          bestPoints = points;
          bestNet = net;
          bestPlayerId = member.playerId;
          usedGross = gross;
        }
      }

      if (bestPlayerId) {
        totalPoints += bestPoints;
        totalGross += usedGross;
        totalNet += bestNet;

        const contribution = memberContributions.get(bestPlayerId)!;
        contribution.contribution += bestPoints;
        contribution.holeContributions[holeNum] = true;
      }
    }

    return {
      teamId: teamScores[0]?.teamId || '',
      rawScore: totalPoints,
      resultData: {
        team_score: totalPoints,
        gross_score: totalGross,
        net_score: totalNet,
      },
      memberScores: Array.from(memberContributions.entries()).map(
        ([playerId, data]) => ({
          playerId,
          contribution: data.contribution,
          holeContributions: data.holeContributions,
        })
      ),
    };
  }

  /**
   * Calculate Ambrose score from team member scorecards
   */
  calculateAmbrose(
    teamScores: ScorecardWithHandicap[],
    courseData: CourseHoleData,
    config: EngineConfig = DEFAULT_ENGINE_CONFIG
  ): TeamScoringResult {
    // Calculate team handicap
    const teamHandicap = config.useHandicap
      ? calculateAmbroseHandicap(teamScores.map((sc) => sc.handicap))
      : 0;

    const playingHandicap = getPlayingHandicap(
      teamHandicap,
      courseData.slopeRating,
      courseData.courseRating,
      courseData.par,
      'scramble'
    );

    const holeMap = new Map(courseData.holes.map((h) => [h.number, h]));

    // In Scramble, team plays best shot each time
    // We assume the scorecard contains the final team strokes per hole
    const teamScorecard = teamScores[0];
    if (!teamScorecard) {
      return {
        teamId: '',
        rawScore: 0,
        resultData: {},
        memberScores: [],
      };
    }

    const scores = this.parseScores(teamScorecard.scorecard.scores);

    let totalGross = 0;
    let totalNet = 0;

    for (const score of scores) {
      const hole = holeMap.get(score.holeNumber);
      if (!hole || score.strokes === null || score.strokes === undefined) {
        continue;
      }

      totalGross += score.strokes;

      const strokesReceived = calculateStrokesForHole(
        playingHandicap,
        hole.strokeIndex
      );
      const net = calculateNetScore(score.strokes, strokesReceived);
      totalNet += net;
    }

    return {
      teamId: teamScorecard.teamId || '',
      rawScore: totalNet, // Ambrose uses net score
      resultData: {
        team_score: totalNet,
        gross_score: totalGross,
        net_score: totalNet,
      },
      memberScores: teamScores.map((sc) => ({
        playerId: sc.scorecard.player_id,
        contribution: 0, // All players contribute equally in Ambrose
      })),
    };
  }

  /**
   * Calculate Aggregate score (sum of all members)
   *
   * @param teamScores - Array of scorecards for team members
   * @param courseData - Course hole data
   * @param config - Engine configuration
   * @param scoringMode - 'net' for net strokes (lower is better), 'stableford' for points (higher is better)
   */
  calculateAggregate(
    teamScores: ScorecardWithHandicap[],
    courseData: CourseHoleData,
    config: EngineConfig = DEFAULT_ENGINE_CONFIG,
    scoringMode: 'net' | 'stableford' = 'net'
  ): TeamScoringResult {
    let teamGross = 0;
    let teamNet = 0;
    let teamPoints = 0;

    const memberScores: TeamScoringResult['memberScores'] = [];

    for (const sc of teamScores) {
      const result = this.calculateScore(sc, courseData, config);
      const playerPoints = result.stablefordPoints ?? 0;
      teamGross += result.grossScore;
      teamNet += result.netScore;
      teamPoints += playerPoints;

      memberScores.push({
        playerId: sc.scorecard.player_id,
        contribution: scoringMode === 'stableford' ? playerPoints : result.netScore,
      });
    }

    const rawScore = scoringMode === 'stableford' ? teamPoints : teamNet;

    return {
      teamId: teamScores[0]?.teamId || '',
      rawScore,
      resultData: {
        team_score: rawScore,
        gross_score: teamGross,
        net_score: teamNet,
        stableford_points: teamPoints,
      },
      memberScores,
    };
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
