/**
 * Scoring Engine Interface
 *
 * Defines the contract that all scoring engines must implement.
 */

import type {
  ScoringResult,
  LeaderboardEntry,
  ScorecardWithHandicap,
  CourseHoleData,
  EngineConfig,
} from '../types';

/**
 * Interface for all scoring engines.
 *
 * Each engine handles a specific game type (Stableford, Stroke, Match Play, etc.)
 * and provides methods for calculating scores and generating leaderboards.
 */
export interface IScoringEngine {
  /**
   * The game type this engine handles
   */
  readonly gameType: string;

  /**
   * Calculate the score for a single scorecard
   *
   * @param scorecard - The scorecard with player handicap
   * @param courseData - Course hole information
   * @param config - Engine configuration options
   * @returns Calculated scoring result
   */
  calculateScore(
    scorecard: ScorecardWithHandicap,
    courseData: CourseHoleData,
    config?: EngineConfig
  ): ScoringResult;

  /**
   * Calculate leaderboard from multiple scorecards
   *
   * @param scorecards - Array of scorecards with handicaps
   * @param courseData - Course hole information
   * @param config - Engine configuration options
   * @returns Sorted leaderboard entries with positions
   */
  calculateLeaderboard(
    scorecards: ScorecardWithHandicap[],
    courseData: CourseHoleData,
    config?: EngineConfig
  ): LeaderboardEntry[];

  /**
   * Whether higher scores are better (Stableford) or lower (Stroke)
   */
  readonly higherIsBetter: boolean;
}
