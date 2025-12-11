/**
 * useScorecardStats
 *
 * Custom hook for calculating player statistics and par totals for scorecard displays.
 * Provides memoized calculations for optimal performance in large scorecards.
 */

import { useMemo } from 'react';
import type { Hole } from '@/types/database.types';
import {
  calculatePlayerStats,
  calculateParTotals,
  splitHolesByNine,
  generateDefaultHoles,
  type ScorecardPlayerData,
  type PlayerStats,
  type ParTotals,
} from '@/utils/scorecardCalculations';

/**
 * Result from useScorecardStats hook
 */
export interface ScorecardStatsResult {
  /** Statistics for each player */
  playerStats: PlayerStats[];
  /** Par totals for front 9, back 9, and total */
  parTotals: ParTotals;
  /** Front 9 holes */
  front9Holes: Hole[];
  /** Back 9 holes */
  back9Holes: Hole[];
  /** All holes (may be generated defaults if none provided) */
  holes: Hole[];
}

/**
 * Calculate player statistics and par totals for scorecard display
 *
 * @param players Array of player data with scores
 * @param holes Array of holes (will generate defaults if empty/null)
 * @returns Memoized statistics and hole data
 */
export function useScorecardStats(
  players: ScorecardPlayerData[],
  holes: Hole[] | null | undefined
): ScorecardStatsResult {
  // Ensure we have holes (generate defaults if needed)
  const resolvedHoles = useMemo(() => {
    if (holes && holes.length > 0) return holes;
    return generateDefaultHoles();
  }, [holes]);

  // Calculate player statistics
  const playerStats = useMemo(
    () => calculatePlayerStats(players, resolvedHoles),
    [players, resolvedHoles]
  );

  // Calculate par totals
  const parTotals = useMemo(
    () => calculateParTotals(resolvedHoles),
    [resolvedHoles]
  );

  // Split holes into front and back 9
  const { front9, back9 } = useMemo(
    () => splitHolesByNine(resolvedHoles),
    [resolvedHoles]
  );

  return {
    playerStats,
    parTotals,
    front9Holes: front9,
    back9Holes: back9,
    holes: resolvedHoles,
  };
}

export default useScorecardStats;
