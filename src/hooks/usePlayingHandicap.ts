/**
 * usePlayingHandicap - Calculate effective handicap for scoring
 *
 * Encapsulates all handicap logic:
 * 1. Selects base handicap (GA or Social) based on handicap source
 * 2. Calculates daily handicap using GA 2025 formula (Premium only)
 * 3. Applies game type allowance
 *
 * Premium gating: Free tier uses raw base handicap. Premium gets
 * course-adjusted daily handicap via slope/course rating.
 */

import { useMemo } from 'react';
import { useIsPremium } from '@/context/SubscriptionContext';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import { getBaseHandicap } from '@/utils/scorecardCalculations';
import { getHandicapAllowance } from '@/services/scoring/utils/handicapUtils';
import type { Hole, TeeBox, GameType, HandicapSource } from '@/types/database';

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
}

interface PlayingHandicapResult {
  /** GA or Social handicap value before any course adjustment */
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
 */
export function usePlayingHandicap({
  player,
  selectedTeeData,
  holes,
  handicapSource,
  gameType,
}: UsePlayingHandicapParams): PlayingHandicapResult {
  const isPremium = useIsPremium();

  return useMemo(() => {
    const source = handicapSource ?? 'profile';

    // Step 1: Get base handicap (GA or Social)
    const baseHandicap = getBaseHandicap(player as Parameters<typeof getBaseHandicap>[0], source);

    // Step 2: Calculate daily handicap (Premium only, requires tee data)
    let dailyHandicap = baseHandicap;
    let isDailyHandicap = false;

    if (
      isPremium &&
      source !== 'none' &&
      selectedTeeData?.slopeRating &&
      selectedTeeData?.courseRating
    ) {
      const coursePar = Array.isArray(holes)
        ? holes.reduce((sum, h) => sum + h.par, 0)
        : 0;

      if (coursePar > 0) {
        const result = calculateGADailyHandicap({
          gaHandicap: baseHandicap,
          slopeRating: selectedTeeData.slopeRating,
          courseRating: selectedTeeData.courseRating,
          par: coursePar,
          gender: player?.gender,
        });
        dailyHandicap = result.dailyHandicap;
        isDailyHandicap = true;
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
  }, [player, selectedTeeData, holes, handicapSource, gameType, isPremium]);
}

/**
 * Pure function version for use outside React components.
 * Does NOT check Premium status - caller must handle gating.
 */
export function calculatePlayingHandicap(params: {
  player: ScorecardPlayerInfo | null;
  selectedTeeData?: TeeBox | null;
  holes?: Hole[];
  handicapSource?: HandicapSource | null;
  gameType?: GameType;
  applyDailyHandicap?: boolean;
}): PlayingHandicapResult {
  const { player, selectedTeeData, holes, handicapSource, gameType, applyDailyHandicap = true } = params;
  const source = handicapSource ?? 'profile';

  const baseHandicap = getBaseHandicap(player as Parameters<typeof getBaseHandicap>[0], source);

  let dailyHandicap = baseHandicap;
  let isDailyHandicap = false;

  if (
    applyDailyHandicap &&
    source !== 'none' &&
    selectedTeeData?.slopeRating &&
    selectedTeeData?.courseRating
  ) {
    const coursePar = Array.isArray(holes)
      ? holes.reduce((sum, h) => sum + h.par, 0)
      : 0;

    if (coursePar > 0) {
      const result = calculateGADailyHandicap({
        gaHandicap: baseHandicap,
        slopeRating: selectedTeeData.slopeRating,
        courseRating: selectedTeeData.courseRating,
        par: coursePar,
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
