/**
 * Player Statistics Hooks - Module Index
 *
 * TanStack Query hooks for fetching comprehensive player statistics.
 * Provides hooks for analyzing player performance, score distribution,
 * course stats, and historical data.
 *
 * This module is organized into:
 * - types.ts: Type definitions
 * - helpers.ts: Score calculation helper functions
 * - queries.ts: Query hooks for fetching data
 *
 * @example
 * ```tsx
 * // Import from the playerStatistics module
 * import { usePlayerStatistics } from '@/hooks/playerStatistics';
 *
 * // Or import the entire module
 * import * as playerStatistics from '@/hooks/playerStatistics';
 * ```
 */

// Re-export types
export type {
  ScoreDistribution,
  CourseStats,
  RoundSummary,
  ParTypeStats,
  ShortGameStats,
  PuttingDepthStats,
  FairwayMissDirectionStats,
  GreenMissDirectionStats,
  BunkerStats,
  HazardStats,
  RoundStatPoint,
  PlayerStatistics,
  UsePlayerStatisticsOptions,
} from './types';

// Re-export helpers (for testing or custom calculations)
export {
  getScoreCategory,
  countScoreDistribution,
  calculateParTypeStats,
  calculateShortGameStats,
  calculatePuttingDepthStats,
} from './helpers';

// Re-export advanced helpers
export {
  calculateFairwayMissDirectionStats,
  calculateGreenMissDirectionStats,
  calculateBunkerStats,
  calculateHazardStats,
} from './advancedHelpers';

export type { EnrichedHoleScore } from './advancedHelpers';

// Re-export query hooks
export { usePlayerStatistics } from './queries';
