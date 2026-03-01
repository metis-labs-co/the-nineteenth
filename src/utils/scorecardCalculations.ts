/**
 * Scorecard Calculations
 *
 * Shared utility functions for calculating player statistics and totals
 * for scorecard displays. Used by ReviewScorecardScreen and RoundScorecardTab.
 */

import type { Hole, HoleScore, TeeBox } from '@/types/database.types';
import type { MultiBallHoleScore } from '@/types/database/base';
import type { PlayerGender } from '@/types/database/player.types';
import type { HandicapSource } from '@/types/database/enums';
import { isSingleBallScore } from '@/types/database/base';
import { getStrokesReceived, calculateStablefordPointsNet, calculateParScore } from './scoring';
import { calculateGADailyHandicap } from './dailyHandicap';

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
  handicap?: number | null; // GA Handicap (profile)
  handicap_index?: number | null; // Social Handicap Index (calculated from app rounds)
  gender?: PlayerGender | null; // For daily handicap calculation
}

/**
 * Statistics for a single player's round
 */
export interface PlayerStats {
  playerId: string;
  playerName: string;
  handicap: number; // Raw GA handicap index
  dailyHandicap: number; // Daily handicap (calculated from tee ratings)
  front9Gross: number;
  back9Gross: number;
  front9Stableford: number;
  back9Stableford: number;
  front9ParScore: number; // Par game: sum of +1/0/-1 for front 9
  back9ParScore: number; // Par game: sum of +1/0/-1 for back 9
  totalGross: number;
  totalNet: number;
  totalStableford: number;
  totalParScore: number; // Par game: sum of all hole results
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
 * Get the base handicap value based on the handicap source
 *
 * @param player Player info with handicap values
 * @param handicapSource Which handicap value to use
 * @returns The base handicap value (before daily calculation)
 */
export function getBaseHandicap(
  player: ScorecardPlayerInfo | null,
  handicapSource: HandicapSource = 'profile'
): number {
  if (!player) return 0;

  switch (handicapSource) {
    case 'none':
      return 0;
    case 'calculated':
      // Use Social Handicap Index, fallback to GA handicap if not available
      return player.handicap_index ?? player.handicap ?? 0;
    case 'profile':
    default:
      // Use GA Handicap (profile)
      return player.handicap ?? 0;
  }
}

/**
 * Calculate statistics for all players in a scorecard display
 *
 * @param players Array of player data with scores
 * @param holes Array of hole data
 * @param selectedTee Optional tee data with slope/course ratings for daily handicap calculation
 * @param handicapSource Which handicap value to use ('profile' = GA, 'calculated' = Social Index, 'none' = no handicap)
 * @returns Array of player statistics
 */
export function calculatePlayerStats(
  players: ScorecardPlayerData[],
  holes: Hole[],
  selectedTee?: TeeBox | null,
  handicapSource: HandicapSource = 'profile'
): PlayerStats[] {
  // Guard against non-array holes data
  const safeHoles = Array.isArray(holes) ? holes : [];

  // Calculate course par once for daily handicap calculations
  const coursePar = safeHoles.reduce((sum, hole) => sum + hole.par, 0);

  return players.map((playerData) => {
    const player = playerData.player;
    const scores = playerData.scores;

    // Get base handicap based on source (profile, calculated, or none)
    const handicap = getBaseHandicap(player, handicapSource);

    // Calculate daily handicap if tee data is available and not using 'none'
    let dailyHandicap = handicap;
    if (handicapSource !== 'none' && selectedTee?.slopeRating && selectedTee?.courseRating && coursePar > 0) {
      const result = calculateGADailyHandicap({
        gaHandicap: handicap,
        slopeRating: selectedTee.slopeRating,
        courseRating: selectedTee.courseRating,
        par: coursePar,
        gender: player?.gender,
      });
      dailyHandicap = result.dailyHandicap;
    }

    let front9Gross = 0;
    let back9Gross = 0;
    let front9Stableford = 0;
    let back9Stableford = 0;
    let front9ParScore = 0;
    let back9ParScore = 0;
    let hasScores = false;

    safeHoles.forEach((hole) => {
      const score = scores?.[String(hole.number)];
      // Only process single-ball scores (for multi-ball, we'd use ball_totals)
      const strokes = score && isSingleBallScore(score) ? score.strokes : 0;
      if (strokes > 0) hasScores = true;
      // Use daily handicap for strokes received calculation
      const strokesReceived = getStrokesReceived(dailyHandicap, hole.strokeIndex);
      const stablefordPoints =
        strokes > 0 ? calculateStablefordPointsNet(strokes, hole.par, strokesReceived) : 0;
      // Calculate par score (+1, 0, -1) for this hole
      const parScore =
        strokes > 0 ? calculateParScore(strokes, hole.par, strokesReceived) : 0;

      if (hole.number <= 9) {
        front9Gross += strokes;
        front9Stableford += stablefordPoints;
        front9ParScore += parScore;
      } else {
        back9Gross += strokes;
        back9Stableford += stablefordPoints;
        back9ParScore += parScore;
      }
    });

    const totalGross = front9Gross + back9Gross;
    // Use daily handicap for net score calculation
    const totalNet = totalGross - dailyHandicap;
    const totalStableford = front9Stableford + back9Stableford;
    const totalParScore = front9ParScore + back9ParScore;

    return {
      playerId: playerData.id,
      playerName: player?.name || 'Unknown',
      handicap,
      dailyHandicap,
      front9Gross,
      back9Gross,
      front9Stableford,
      back9Stableford,
      front9ParScore,
      back9ParScore,
      totalGross,
      totalNet,
      totalStableford,
      totalParScore,
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
  const safeHoles = Array.isArray(holes) ? holes : [];
  let front9 = 0;
  let back9 = 0;

  safeHoles.forEach((hole) => {
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
  const safeHoles = Array.isArray(holes) ? holes : [];
  return {
    front9: safeHoles.filter((h) => h.number <= 9),
    back9: safeHoles.filter((h) => h.number > 9),
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
