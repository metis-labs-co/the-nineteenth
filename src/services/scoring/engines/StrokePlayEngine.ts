/**
 * Stroke Play Scoring Engine
 *
 * Implements stroke play scoring where players count total strokes.
 * Lower scores are better. Supports both gross and net scoring.
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
import { DEFAULT_ENGINE_CONFIG } from '../types';
import { getPlayingHandicap, calculateStrokesForHole } from '../utils/handicapUtils';
import { calculateNetScore } from '../utils/netScoreUtils';
import {
  sortByScore,
  assignPositions,
  createLeaderboardEntry,
} from '../utils/leaderboardUtils';

/**
 * Stroke Play scoring engine.
 *
 * In stroke play, players count total strokes taken.
 * The player with the lowest total wins.
 *
 * Supports:
 * - Gross scoring (total strokes, no handicap)
 * - Net scoring (strokes adjusted for handicap)
 */
export class StrokePlayEngine implements IScoringEngine {
  readonly gameType = 'stroke';
  readonly higherIsBetter = false;

  /**
   * Calculate stroke play score for a single scorecard
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
          'stroke'
        )
      : 0;

    // Parse scores from scorecard
    const scores = this.parseScores(scorecard.scores);

    // Calculate totals
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
    }

    // Use net score as the primary score for ranking if handicaps enabled
    const rawScore = config.useNetScores ? totalNet : totalGross;

    return {
      rawScore,
      resultData: {
        gross_score: totalGross,
        net_score: totalNet,
      },
      grossScore: totalGross,
      netScore: totalNet,
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

    // Sort by strokes (lower is better)
    const sorted = sortByScore(entries, { higherIsBetter: false });

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
 * Create a new Stroke Play engine instance
 */
export function createStrokePlayEngine(): StrokePlayEngine {
  return new StrokePlayEngine();
}
