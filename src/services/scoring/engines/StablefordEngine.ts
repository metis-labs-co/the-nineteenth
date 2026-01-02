/**
 * Stableford Scoring Engine
 *
 * Implements Stableford scoring where players earn points based on
 * net score relative to par on each hole. Higher points are better.
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
import { getPlayingHandicap, calculateStrokesForHole } from '../utils/handicapUtils';
import {
  calculateNetScore,
  getNetToPar,
} from '../utils/netScoreUtils';
import {
  sortByScore,
  assignPositions,
  createLeaderboardEntry,
} from '../utils/leaderboardUtils';

/**
 * Stableford scoring engine.
 *
 * In Stableford, players score points based on net score relative to par:
 * - Net Albatross (3 under): 5 points
 * - Net Eagle (2 under): 4 points
 * - Net Birdie (1 under): 3 points
 * - Net Par: 2 points
 * - Net Bogey (1 over): 1 point
 * - Net Double Bogey or worse: 0 points
 */
export class StablefordEngine implements IScoringEngine {
  readonly gameType = 'stableford';
  readonly higherIsBetter = true;

  /**
   * Calculate Stableford points for a single scorecard
   */
  calculateScore(
    { scorecard, handicap }: ScorecardWithHandicap,
    courseData: CourseHoleData,
    config: EngineConfig = DEFAULT_ENGINE_CONFIG
  ): ScoringResult {
    // Get playing handicap adjusted for course
    const playingHandicap = config.useHandicap
      ? getPlayingHandicap(
          handicap,
          courseData.slopeRating,
          courseData.courseRating,
          courseData.par,
          'stableford'
        )
      : 0;

    // Parse scores from scorecard
    const scores = this.parseScores(scorecard.scores);

    // Calculate hole-by-hole points
    let totalPoints = 0;
    let totalGross = 0;
    let totalNet = 0;

    const holeMap = new Map(courseData.holes.map((h) => [h.number, h]));

    for (const score of scores) {
      const hole = holeMap.get(score.holeNumber);
      if (!hole || score.strokes === null || score.strokes === undefined) {
        continue;
      }

      const gross = score.strokes;
      totalGross += gross;

      // Calculate strokes received on this hole
      const strokesReceived = calculateStrokesForHole(
        playingHandicap,
        hole.strokeIndex
      );

      // Net score for this hole
      const net = calculateNetScore(gross, strokesReceived);
      totalNet += net;

      // Stableford points based on net score relative to par
      const netToPar = getNetToPar(net, hole.par);
      const points = getStablefordPoints(netToPar);
      totalPoints += points;
    }

    return {
      rawScore: totalPoints,
      resultData: {
        stableford_points: totalPoints,
      },
      grossScore: totalGross,
      netScore: totalNet,
      stablefordPoints: totalPoints,
    };
  }

  /**
   * Calculate leaderboard from multiple scorecards
   */
  calculateLeaderboard(
    scorecards: ScorecardWithHandicap[],
    courseData: CourseHoleData,
    config: EngineConfig = DEFAULT_ENGINE_CONFIG
  ): LeaderboardEntry[] {
    if (scorecards.length === 0) {
      return [];
    }

    // Calculate scores for all players
    const entries: LeaderboardEntry[] = scorecards.map((sc) => {
      const result = this.calculateScore(sc, courseData, config);
      return createLeaderboardEntry(sc.scorecard.player_id, result, false);
    });

    // Sort by points (higher is better)
    const sorted = sortByScore(entries, { higherIsBetter: true });

    // Assign positions with tie handling
    return assignPositions(sorted);
  }

  /**
   * Parse scores from scorecard JSON
   */
  private parseScores(
    scores: Record<string, unknown> | null
  ): HoleScore[] {
    if (!scores) {
      return [];
    }

    const result: HoleScore[] = [];

    // Scores may be keyed by hole number as string
    for (const [key, value] of Object.entries(scores)) {
      const holeNumber = parseInt(key, 10);
      if (isNaN(holeNumber) || holeNumber < 1 || holeNumber > 18) {
        continue;
      }

      // Value could be a number (strokes) or an object with strokes property
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
            putts: typeof scoreObj.putts === 'number' ? scoreObj.putts : undefined,
          });
        }
      }
    }

    return result;
  }
}

/**
 * Create a new Stableford engine instance
 */
export function createStablefordEngine(): StablefordEngine {
  return new StablefordEngine();
}
