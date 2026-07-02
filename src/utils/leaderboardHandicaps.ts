import type { Hole, TeeBox } from '@/types';
import type { HandicapSource } from '@/types/database/enums';
import { calculateGADailyHandicap } from './dailyHandicap';

export interface LeaderboardHandicapInput {
  playerId: string;
  /** Player's raw WHS/GA handicap index (profile handicap). */
  gaHandicap: number | null | undefined;
  /**
   * Daily (playing) handicap captured at scoring time (`daily_handicap_used`),
   * when known. Populated on completed/confirmed scorecards; null/undefined on
   * in-progress cards.
   */
  storedDailyHandicap?: number | null;
  /** Used for the WHS consistency factor when computing from the tee. */
  gender?: 'male' | 'female' | null;
}

/**
 * Resolve each player's daily (playing) handicap for leaderboard scoring so the
 * leaderboard's Stableford/Par points match the on-course scorecard.
 *
 * Resolution mirrors the scorecard's `calculatePlayerStats`:
 *   1. Prefer the stored `daily_handicap_used` snapshot — authoritative once a
 *      card is completed/confirmed.
 *   2. Otherwise convert the GA index → daily handicap via the round tee's
 *      slope/course rating (the same live recompute the scorecard performs for
 *      in-progress cards).
 *   3. Otherwise (no tee data, or handicap disabled) fall back to the raw GA
 *      index.
 *
 * @returns Map of playerId → daily handicap.
 */
export function buildDailyHandicapMap(
  players: LeaderboardHandicapInput[],
  holes: Hole[],
  selectedTee: TeeBox | null | undefined,
  handicapSource: HandicapSource = 'profile'
): Record<string, number> {
  const safeHoles = Array.isArray(holes) ? holes : [];
  const coursePar = safeHoles.reduce((sum, hole) => sum + hole.par, 0);

  const map: Record<string, number> = {};

  for (const player of players) {
    const ga = player.gaHandicap ?? 0;

    // 1. Stored snapshot wins.
    if (typeof player.storedDailyHandicap === 'number') {
      map[player.playerId] = player.storedDailyHandicap;
      continue;
    }

    // 2. Compute from the tee's slope/course rating.
    if (
      handicapSource !== 'none' &&
      selectedTee?.slopeRating &&
      selectedTee?.courseRating &&
      coursePar > 0
    ) {
      map[player.playerId] = calculateGADailyHandicap({
        gaHandicap: ga,
        slopeRating: selectedTee.slopeRating,
        courseRating: selectedTee.courseRating,
        par: coursePar,
        gender: player.gender ?? undefined,
      }).dailyHandicap;
      continue;
    }

    // 3. Raw index fallback.
    map[player.playerId] = ga;
  }

  return map;
}
