/**
 * Scorecard Calculations
 *
 * Shared utility functions for calculating player statistics and totals
 * for scorecard displays. Used by ReviewScorecardScreen and RoundScorecardTab.
 */

import type { Hole, HoleScore } from '@/types/database.types';
import type { MultiBallHoleScore } from '@/types/database/base';
import { isSingleBallScore } from '@/types/database/base';
import { getStrokesReceived, calculateStablefordPointsNet } from './scoring';

// =====================================================
// TYPES
// =====================================================

/**
 * Scores record format - maps hole number (as string) to score data
 * Supports both single-ball (HoleScore) and multi-ball (MultiBallHoleScore) formats
 */
export type ScoresRecord = Record<string, HoleScore | MultiBallHoleScore>;

/**
 * Minimal player info needed for scorecard calculations
 */
export interface ScorecardPlayerInfo {
  id: string;
  name: string;
  handicap?: number | null;
}

/**
 * Statistics for a single player's round
 */
export interface PlayerStats {
  playerId: string;
  playerName: string;
  handicap: number;
  front9Gross: number;
  back9Gross: number;
  front9Stableford: number;
  back9Stableford: number;
  totalGross: number;
  totalNet: number;
  totalStableford: number;
  hasScores: boolean;
}

/**
 * Par totals for front 9, back 9, and full 18
 */
export interface ParTotals {
  front9: number;
  back9: number;
  total: number;
}

/**
 * Generic player data used for scorecard calculations
 */
export interface ScorecardPlayerData {
  id: string;
  playerId: string;
  player: ScorecardPlayerInfo | null;
  scores: ScoresRecord | null;
  hasScorecard: boolean;
}

// =====================================================
// CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate statistics for all players in a scorecard display
 *
 * @param players Array of player data with scores
 * @param holes Array of hole data
 * @returns Array of player statistics
 */
export function calculatePlayerStats(
  players: ScorecardPlayerData[],
  holes: Hole[]
): PlayerStats[] {
  return players.map((playerData) => {
    const player = playerData.player;
    const scores = playerData.scores;
    const handicap = player?.handicap || 0;

    let front9Gross = 0;
    let back9Gross = 0;
    let front9Stableford = 0;
    let back9Stableford = 0;
    let hasScores = false;

    holes.forEach((hole) => {
      const score = scores?.[String(hole.number)];
      // Only process single-ball scores (for multi-ball, we'd use ball_totals)
      const strokes = score && isSingleBallScore(score) ? score.strokes : 0;
      if (strokes > 0) hasScores = true;
      const strokesReceived = getStrokesReceived(handicap, hole.strokeIndex);
      const stablefordPoints =
        strokes > 0 ? calculateStablefordPointsNet(strokes, hole.par, strokesReceived) : 0;

      if (hole.number <= 9) {
        front9Gross += strokes;
        front9Stableford += stablefordPoints;
      } else {
        back9Gross += strokes;
        back9Stableford += stablefordPoints;
      }
    });

    const totalGross = front9Gross + back9Gross;
    const totalNet = totalGross - handicap;
    const totalStableford = front9Stableford + back9Stableford;

    return {
      playerId: playerData.id,
      playerName: player?.name || 'Unknown',
      handicap,
      front9Gross,
      back9Gross,
      front9Stableford,
      back9Stableford,
      totalGross,
      totalNet,
      totalStableford,
      hasScores,
    };
  });
}

/**
 * Calculate par totals for front 9, back 9, and full round
 *
 * @param holes Array of hole data
 * @returns Par totals object
 */
export function calculateParTotals(holes: Hole[]): ParTotals {
  let front9 = 0;
  let back9 = 0;

  holes.forEach((hole) => {
    if (hole.number <= 9) {
      front9 += hole.par;
    } else {
      back9 += hole.par;
    }
  });

  return { front9, back9, total: front9 + back9 };
}

/**
 * Split holes into front 9 and back 9 arrays
 *
 * @param holes Array of all holes
 * @returns Object with front9 and back9 hole arrays
 */
export function splitHolesByNine(holes: Hole[]): {
  front9: Hole[];
  back9: Hole[];
} {
  return {
    front9: holes.filter((h) => h.number <= 9),
    back9: holes.filter((h) => h.number > 9),
  };
}

/**
 * Generate default holes when course data is not available
 *
 * @returns Array of 18 default holes with standard pars and stroke indexes
 */
export function generateDefaultHoles(): Hole[] {
  const pars: (3 | 4 | 5)[] = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];
  const strokeIndexes = [7, 15, 11, 1, 5, 9, 17, 13, 3, 8, 16, 12, 2, 6, 10, 18, 14, 4];

  return Array.from({ length: 18 }, (_, i) => ({
    number: (i + 1) as Hole['number'],
    par: pars[i],
    strokeIndex: strokeIndexes[i],
  }));
}

/**
 * Calculate Stableford points for a single hole
 *
 * @param strokes Gross strokes for the hole
 * @param par Par for the hole
 * @param handicap Player's handicap
 * @param strokeIndex Hole's stroke index
 * @returns Stableford points earned
 */
export function calculateHoleStableford(
  strokes: number,
  par: number,
  handicap: number,
  strokeIndex: number
): number {
  if (strokes <= 0) return 0;
  const strokesReceived = getStrokesReceived(handicap, strokeIndex);
  return calculateStablefordPointsNet(strokes, par, strokesReceived);
}
