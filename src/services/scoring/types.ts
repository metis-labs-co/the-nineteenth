/**
 * Scoring Engine Types
 *
 * Shared types used across all scoring engines.
 */

import type {
  GameType,
  Scorecard,
  HoleScore as DatabaseHoleScore,
  RoundResultData,
} from '@/types/database';
import { STABLEFORD_POINTS } from '@/constants/scoring';

/**
 * Internal hole score representation with hole number
 */
export interface HoleScore extends DatabaseHoleScore {
  holeNumber: number;
}

/**
 * Internal hole representation matching database schema
 */
export interface Hole {
  number: number;
  par: number;
  strokeIndex: number;
}

// ============================================================================
// Core Scoring Types
// ============================================================================

/**
 * Result from calculating a single scorecard's score
 */
export interface ScoringResult {
  /** The calculated raw score (points for Stableford, strokes for Stroke) */
  rawScore: number;
  /** Structured result data for storage */
  resultData: RoundResultData;
  /** Gross score (strokes before handicap adjustment) */
  grossScore: number;
  /** Net score (strokes after handicap adjustment) */
  netScore: number;
  /** Stableford points (for Stableford game type) */
  stablefordPoints?: number;
}

/**
 * Entry in a leaderboard with position
 */
export interface LeaderboardEntry {
  participantId: string;
  playerId?: string;
  teamId?: string;
  rawScore: number;
  position: number;
  tied: boolean;
  competitionPoints: number;
  resultData: RoundResultData;
  isTeamResult: boolean;
}

/**
 * Team scoring result
 */
export interface TeamScoringResult {
  teamId: string;
  rawScore: number;
  resultData: RoundResultData;
  memberScores: {
    playerId: string;
    contribution: number;
    holeContributions?: Record<number, boolean>;
  }[];
}

/**
 * Match play hole result
 */
export interface MatchHoleResult {
  holeNumber: number;
  player1Score: number | null;
  player2Score: number | null;
  player1NetScore: number | null;
  player2NetScore: number | null;
  result: 'player1' | 'player2' | 'halved' | 'incomplete';
}

/**
 * Match play overall result
 */
export interface MatchResult {
  player1Id: string;
  player2Id: string;
  result: 'player1' | 'player2' | 'halved' | 'incomplete';
  margin?: string; // e.g., "3&2", "2UP", "A/S"
  holesPlayed: number;
  player1Up: number;
  player2Up: number;
  holeResults: MatchHoleResult[];
}

// ============================================================================
// Engine Configuration
// ============================================================================

/**
 * Configuration for scoring calculations
 */
export interface EngineConfig {
  /** Apply handicap adjustments */
  useHandicap: boolean;
  /** Use net scores for comparison (Stableford always uses net) */
  useNetScores: boolean;
  /** Course slope rating for handicap adjustment */
  slopeRating?: number;
  /** Course rating for handicap adjustment */
  courseRating?: number;
  /** Standard par for the course */
  coursePar?: number;
}

/**
 * Default engine configuration
 */
export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  useHandicap: true,
  useNetScores: true,
};

// ============================================================================
// Input Types
// ============================================================================

/**
 * Scorecard with associated player handicap
 */
export interface ScorecardWithHandicap {
  scorecard: Scorecard;
  handicap: number;
  teamId?: string;
}

/**
 * Course hole data needed for scoring
 */
export interface CourseHoleData {
  holes: Hole[];
  par: number;
  slopeRating?: number;
  courseRating?: number;
}

// ============================================================================
// Stableford Points Lookup
// ============================================================================

/**
 * Get Stableford points for a net score relative to par
 * Uses STABLEFORD_POINTS from @/constants/scoring
 */
export function getStablefordPoints(netToPar: number): number {
  if (netToPar <= -3) return STABLEFORD_POINTS.ALBATROSS_OR_BETTER;
  if (netToPar === -2) return STABLEFORD_POINTS.EAGLE;
  if (netToPar === -1) return STABLEFORD_POINTS.BIRDIE;
  if (netToPar === 0) return STABLEFORD_POINTS.PAR;
  if (netToPar === 1) return STABLEFORD_POINTS.BOGEY;
  return STABLEFORD_POINTS.DOUBLE_OR_WORSE;
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export type { GameType, Scorecard, RoundResultData };
