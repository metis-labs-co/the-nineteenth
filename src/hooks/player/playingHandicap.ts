/**
 * usePlayingHandicap - Calculate effective handicap for scoring
 *
 * Encapsulates all handicap logic:
 * 1. Selects base handicap (WHS or Social) based on handicap source
 * 2. Calculates daily handicap using WHS formula when tee data is available
 * 3. Applies game type allowance
 */

import { useMemo } from 'react';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import { getBaseHandicap } from '@/utils/scorecardCalculations';
import { getHandicapAllowance } from '@/services/scoring/utils/handicapUtils';
import { getEffectiveTeeRatings } from '@/utils/teeResolution';
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
export function usePlayingHandicap({
  player,
  selectedTeeData,
  holes,
  handicapSource,
  gameType,
  nineType,
}: UsePlayingHandicapParams): PlayingHandicapResult {
  return useMemo(() => {
    const source = handicapSource ?? 'profile';

    // Step 1: Get base handicap (WHS or Social)
    const baseHandicap = getBaseHandicap(player as Parameters<typeof getBaseHandicap>[0], source);

    // Step 2: Calculate daily handicap when tee data is available
    let dailyHandicap = baseHandicap;
    let isDailyHandicap = false;

    if (source !== 'none' && selectedTeeData) {
      const { slope, cr } = getEffectiveTeeRatings(selectedTeeData, nineType ?? 'full');

      if (slope && cr) {
        const coursePar = Array.isArray(holes)
          ? holes.reduce((sum, h) => sum + h.par, 0)
          : 0;

        if (coursePar > 0) {
          const result = calculateGADailyHandicap({
            gaHandicap: baseHandicap,
            slopeRating: slope,
            courseRating: cr,
            par: coursePar,
            gender: player?.gender,
          });
          dailyHandicap = result.dailyHandicap;
          isDailyHandicap = true;
        }
      }
    }

    // Step 3: Apply game type allowance
    const allowance = getHandicapAllowance(gameType);
    const playingHandicap = Math.round(dailyHandicap * allowance);

    return {
      baseHandicap,
      dailyHandicap,
      playingHandicap,
      handicapLabel: isDailyHandicap ? 'DHC' : 'HC',
      isDailyHandicap,
    };
  }, [player, selectedTeeData, holes, handicapSource, gameType, nineType]);
}

/**
 * Pure function version for use outside React components.
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
    const { slope, cr } = getEffectiveTeeRatings(selectedTeeData, nineType ?? 'full');

    if (slope && cr) {
      const coursePar = Array.isArray(holes)
        ? holes.reduce((sum, h) => sum + h.par, 0)
        : 0;

      if (coursePar > 0) {
        const result = calculateGADailyHandicap({
          gaHandicap: baseHandicap,
          slopeRating: slope,
          courseRating: cr,
          par: coursePar,
          gender: player?.gender,
        });
        dailyHandicap = result.dailyHandicap;
        isDailyHandicap = true;
      }
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
