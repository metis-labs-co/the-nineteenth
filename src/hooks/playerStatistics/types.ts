/**
 * Player Statistics Hooks - Type Definitions
 *
 * Types for player statistics calculations and display.
 *
 * Types:
 * - ScoreDistribution: Eagles, birdies, pars, bogeys breakdown
 * - CourseStats: Statistics per course played
 * - RoundSummary: Summary of a single round
 * - ParTypeStats: Statistics broken down by hole par type
 * - ShortGameStats: Scrambling and short game statistics
 * - PuttingDepthStats: Extended putting statistics
 * - FairwayMissDirectionStats: Fairway miss direction aggregates
 * - GreenMissDirectionStats: Green miss direction aggregates
 * - BunkerStats: Bunker aggregate statistics
 * - HazardStats: Hazard aggregate statistics
 * - RoundStatPoint: Per-round data point for sparkline trends
 * - PlayerStatistics: Complete player statistics object
 */

import type { GameType } from '@/types/database/enums';

/**
 * Score distribution breakdown
 */
export interface ScoreDistribution {
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubleBogeys: number;
  triplePlus: number;
}

/**
 * Statistics for a specific course
 */
export interface CourseStats {
  courseId: string;
  courseName: string;
  timesPlayed: number;
  averageScore: number;
  bestScore: number;
}

/**
 * Summary of a single round
 */
export interface RoundSummary {
  roundId: string;
  competitionId: string | null;
  competitionName: string;
  courseName: string;
  date: string;
  totalGross: number;
  totalPoints: number;
  holesPlayed: number;
  isPracticeRound: boolean;
  gameType: GameType;
}

/**
 * Statistics broken down by hole par type (3, 4, or 5)
 */
export interface ParTypeStats {
  holesPlayed: number;
  averageScore: number;
  scoreToPar: number; // e.g., +0.4 means averaging 0.4 over par
  girPercentage: number | null; // null if no GIR data
  birdiePercentage: number;
  parPercentage: number;
  bogeyPercentage: number;
  doublePlusPercentage: number;
}

/**
 * Short game statistics derived from GIR and score data
 */
export interface ShortGameStats {
  scramblingPercentage: number | null; // null if no GIR data
  scrambleAttempts: number; // total missed GIRs
  scramblesMade: number; // missed GIR + made par or better
  bogeyAvoidanceRate: number; // % of holes with par or better
  doubleBogeyOrWorseRate: number; // % of holes with double+
}

/**
 * Extended putting statistics
 */
export interface PuttingDepthStats {
  onePuttPercentage: number | null; // null if no putt data
  threePuttPercentage: number | null;
  puttsPerGIR: number | null; // avg putts when hitting GIR
}

/**
 * Fairway miss direction aggregates
 */
export interface FairwayMissDirectionStats {
  leftCount: number;
  rightCount: number;
  totalMisses: number;
  leftPercentage: number | null;
  rightPercentage: number | null;
}

/**
 * Green miss direction aggregates
 */
export interface GreenMissDirectionStats {
  leftCount: number;
  rightCount: number;
  longCount: number;
  shortCount: number;
  totalMisses: number;
  leftPercentage: number | null;
  rightPercentage: number | null;
  longPercentage: number | null;
  shortPercentage: number | null;
}

/**
 * Bunker aggregate statistics
 */
export interface BunkerStats {
  totalBunkerShots: number;
  holesWithBunkers: number;
  totalHolesTracked: number;
  averageBunkerShotsPerRound: number | null;
  holesWithBunkersPercentage: number | null;
}

/**
 * Hazard aggregate statistics
 */
export interface HazardStats {
  waterCount: number;
  obCount: number;
  lateralCount: number;
  lostBallCount: number;
  totalHazards: number;
  averageHazardsPerRound: number | null;
  holesWithHazards: number;
  totalHolesTracked: number;
}

/**
 * Per-round data point for sparkline trends
 */
export interface RoundStatPoint {
  roundId: string;
  date: string;
  grossScore: number;
  points: number;
  fairwayPercentage: number | null;
  girPercentage: number | null;
  averagePutts: number | null;
  scramblingPercentage: number | null;
}

/**
 * Complete player statistics
 */
export interface PlayerStatistics {
  // Overview Stats
  roundsPlayed: number;
  practiceRoundsPlayed: number;
  competitionRoundsPlayed: number;
  competitionsEntered: number;
  competitionsWon: number;
  holesPlayed: number;

  // Score Distribution
  scoreDistribution: ScoreDistribution;
  totalScoreDistribution: number;

  // Averages
  averageGrossScore: number;
  averageStablefordPoints: number;
  averageScorePerHole: number;

  // Best/Worst Performance
  bestRound: RoundSummary | null;
  worstRound: RoundSummary | null;
  bestStablefordRound: RoundSummary | null;

  // Course Stats
  favouriteCourse: CourseStats | null;
  courseStats: CourseStats[];

  // Scoring Records
  lowestGrossScore: number | null;
  highestStablefordPoints: number | null;

  // Recent Activity
  recentRounds: RoundSummary[];

  // Scoring Percentages
  parOrBetterPercentage: number;
  birdieOrBetterPercentage: number;

  // Putting Stats (only populated if user has recorded putts)
  totalPutts: number | null;
  averagePuttsPerRound: number | null;
  averagePuttsPerHole: number | null;
  holesWithPuttsRecorded: number;

  // Fairway Stats (only populated if user has recorded FIR)
  fairwaysHit: number | null;
  fairwayOpportunities: number; // Par 4s and Par 5s where FIR was recorded
  fairwayPercentage: number | null;

  // Green in Regulation Stats (only populated if user has recorded GIR)
  greensInRegulation: number | null;
  girOpportunities: number; // Holes where GIR was recorded
  girPercentage: number | null;

  // Par Type Stats
  par3Stats: ParTypeStats;
  par4Stats: ParTypeStats;
  par5Stats: ParTypeStats;

  // Short Game Stats
  shortGame: ShortGameStats;

  // Putting Depth Stats
  puttingDepth: PuttingDepthStats;

  // Fairway Miss Direction Stats (Premium)
  fairwayMissDirection: FairwayMissDirectionStats;

  // Green Miss Direction Stats (Premium)
  greenMissDirection: GreenMissDirectionStats;

  // Bunker Stats (Premium)
  bunkerStats: BunkerStats;

  // Hazard Stats (Premium)
  hazardStats: HazardStats;

  // Per-round sparkline data (last 10 rounds, ordered oldest-to-newest)
  roundTrends: RoundStatPoint[];
}

/**
 * Options for usePlayerStatistics hook
 */
export interface UsePlayerStatisticsOptions {
  enabled?: boolean;
  leagueId?: string;
  competitionId?: string;
}
