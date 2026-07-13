/**
 * usePlayingHandicap - Calculate effective handicap for scoring
 *
 * Encapsulates all handicap logic:
 * 1. Selects base handicap (WHS or Social) based on handicap source
 * 2. Calculates daily handicap using WHS formula when tee data is available
 * 3. Applies game type allowance
 */

import { useMemo } from 'react';
import { calculateNineAwareDailyHandicap } from '@/utils/dailyHandicap';
import { getBaseHandicap } from '@/utils/scorecardCalculations';
import { getHandicapAllowance } from '@/services/scoring/utils/handicapUtils';
import type { Hole, TeeBox, GameType, HandicapSource } from '@/types/database';
import type { NineType } from '@/types/database/enums';

interface ScorecardPlayerInfo {
  handicap?: number | null;
  handicap_index?: number | null;
  gender?: 'male' | 'female' | null;
}

interface UsePlayingHandicapParams {
  player: ScorecardPlayerInfo | null;
  selectedTeeData?: TeeBox | null;
  holes?: Hole[];
  handicapSource?: HandicapSource | null;
  gameType?: GameType;
  nineType?: NineType;
}

interface PlayingHandicapResult {
  /** WHS or Social handicap value before any course adjustment */
  baseHandicap: number;
  /** Course-adjusted handicap (if Premium and tee data available) */
  dailyHandicap: number;
  /** Final handicap after game type allowance */
  playingHandicap: number;
  /** Display label: 'HC' (raw) or 'DHC' (daily) */
  handicapLabel: string;
  /** Whether daily HC calculation was applied */
  isDailyHandicap: boolean;
}

/**
 * Calculate the effective handicap for a player in a round.
 *
 * @param params.player - Player with handicap fields
 * @param params.selectedTeeData - Tee box data with slope/course ratings
 * @param params.holes - Course holes (for calculating par)
 * @param params.handicapSource - Which base handicap to use ('profile' | 'calculated' | 'none')
 * @param params.gameType - Game type for allowance calculation
 * @param params.nineType - Nine type for selecting appropriate slope/CR ratings (default: 'full')
 */
export function usePlayingHandicap(params: UsePlayingHandicapParams): PlayingHandicapResult {
  const { player, selectedTeeData, holes, handicapSource, gameType, nineType } = params;
  return useMemo(
    () => calculatePlayingHandicap({ player, selectedTeeData, holes, handicapSource, gameType, nineType }),
    [player, selectedTeeData, holes, handicapSource, gameType, nineType],
  );
}

/**
 * Pure function version for use outside React components.
 *
 * Daily handicap is nine-aware: for a 9-hole round (`nineType` of 'front9' or
 * 'back9') the par summed from `holes` is the 9-hole par, so the course rating
 * is matched to that scale via {@link calculateNineAwareDailyHandicap} rather
 * than naively pairing the full 18-hole course rating with a 9-hole par.
 */
export function calculatePlayingHandicap(params: {
  player: ScorecardPlayerInfo | null;
  selectedTeeData?: TeeBox | null;
  holes?: Hole[];
  handicapSource?: HandicapSource | null;
  gameType?: GameType;
  applyDailyHandicap?: boolean;
  nineType?: NineType;
}): PlayingHandicapResult {
  const { player, selectedTeeData, holes, handicapSource, gameType, applyDailyHandicap = true, nineType } = params;
  const source = handicapSource ?? 'profile';

  const baseHandicap = getBaseHandicap(player as Parameters<typeof getBaseHandicap>[0], source);

  let dailyHandicap = baseHandicap;
  let isDailyHandicap = false;

  if (applyDailyHandicap && source !== 'none' && selectedTeeData) {
    const coursePar = Array.isArray(holes)
      ? holes.reduce((sum, h) => sum + h.par, 0)
      : 0;

    if (selectedTeeData.slopeRating && selectedTeeData.courseRating && coursePar > 0) {
      const result = calculateNineAwareDailyHandicap({
        gaHandicap: baseHandicap,
        nineType: nineType ?? 'full',
        par: coursePar,
        slopeRating: selectedTeeData.slopeRating,
        courseRating: selectedTeeData.courseRating,
        slopeRatingFront9: selectedTeeData.slopeRatingFront9,
        courseRatingFront9: selectedTeeData.courseRatingFront9,
        slopeRatingBack9: selectedTeeData.slopeRatingBack9,
        courseRatingBack9: selectedTeeData.courseRatingBack9,
        gender: player?.gender,
      });
      dailyHandicap = result.dailyHandicap;
      isDailyHandicap = true;
    }
  }

  const allowance = getHandicapAllowance(gameType);
  const playingHandicap = Math.round(dailyHandicap * allowance);

  return {
    baseHandicap,
    dailyHandicap,
    playingHandicap,
    handicapLabel: isDailyHandicap ? 'DHC' : 'HC',
    isDailyHandicap,
  };
}
