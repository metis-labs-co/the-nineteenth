/**
 * Wolf Hooks - Type Definitions
 *
 * Hook-specific types for Wolf game hooks.
 * Core Wolf types are defined in @/types/database/wolf.types.ts
 */

import type { WolfServiceErrorCode } from '@/types/database/wolf.types';

// =====================================================
// ERROR TYPES
// =====================================================

/**
 * Error type for Wolf service operations
 */
export interface WolfServiceError extends Error {
  code: WolfServiceErrorCode;
}

// =====================================================
// HOOK RESULT TYPES
// =====================================================

/**
 * Result from processing a Wolf hole decision
 */
export interface ProcessWolfDecisionResult {
  /** Whether the decision was successfully submitted */
  success: boolean;
  /** The Wolf for this hole */
  wolfId: string;
  /** The chosen partner (null for lone wolf) */
  partnerId: string | null;
  /** Whether Blind Wolf was declared */
  isBlindWolf: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Result from recording a Wolf hole result
 */
export interface ProcessWolfHoleResultResponse {
  /** Whether the result was successfully recorded */
  success: boolean;
  /** Whether the hole resulted in a tie */
  isTie: boolean;
  /** Whether the Wolf team won (null if tie) */
  wolfTeamWon: boolean | null;
  /** Points awarded to each player */
  pointsAwarded: Record<string, number>;
  /** Error message if failed */
  error?: string;
}

/**
 * Standing entry for display in leaderboard
 */
export interface WolfStandingsDisplayEntry {
  playerId: string;
  playerName: string;
  totalPoints: number;
  rank: number;
  /** Number of holes as Wolf */
  holesAsWolf: number;
  /** Number of holes won */
  holesWon: number;
  /** Net result if pot enabled */
  netResult?: number;
}

/**
 * Summary of a Wolf hole for display
 */
export interface WolfHoleSummary {
  holeNumber: number;
  wolfId: string;
  wolfName: string;
  partnerId: string | null;
  partnerName: string | null;
  isBlindWolf: boolean;
  isTie: boolean;
  wolfTeamWon: boolean | null;
  pointsAwarded: Record<string, number>;
  /** Human-readable result description */
  resultDescription: string;
}

/**
 * Options for Wolf game creation
 */
export interface WolfGameCreateOptions {
  /** Whether to randomize the wolf order */
  randomizeOrder?: boolean;
  /** Whether to show disclaimer modal for pot */
  showDisclaimer?: boolean;
}

/**
 * Settlement entry for display
 */
export interface WolfSettlementEntry {
  playerId: string;
  playerName: string;
  totalPoints: number;
  totalWinnings: number;
  netResult: number;
}

/**
 * Debt transaction for settlement display
 */
export interface WolfSettlementTransaction {
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string;
  toPlayerName: string;
  amount: number;
}
