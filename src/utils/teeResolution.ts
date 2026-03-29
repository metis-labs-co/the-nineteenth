/**
 * Tee Resolution Utilities
 *
 * Resolves the effective tee for a player based on the resolution order:
 * - Standalone: round_players.selected_tee → rounds.selected_tee
 * - Competition: competition_round_player_tees → competition_players → rounds.selected_tee
 *
 * Also provides 9-hole rating selection based on nine_type.
 */

import type { TeeBox } from '@/types/database/base';
import type { NineType } from '@/types/database/enums';

/**
 * Get effective slope and course rating for a tee based on nine type.
 * Falls back to full-round ratings when 9-hole ratings are unavailable.
 */
export function getEffectiveTeeRatings(
  tee: TeeBox,
  nineType: NineType,
): { slope: number | undefined; cr: number | undefined } {
  if (nineType === 'front9') {
    return {
      slope: tee.slopeRatingFront9 ?? tee.slopeRating,
      cr: tee.courseRatingFront9 ?? tee.courseRating,
    };
  }
  if (nineType === 'back9') {
    return {
      slope: tee.slopeRatingBack9 ?? tee.slopeRating,
      cr: tee.courseRatingBack9 ?? tee.courseRating,
    };
  }
  return { slope: tee.slopeRating, cr: tee.courseRating };
}

/**
 * Resolve a player's tee from a player tee map, falling back to the round default.
 */
export function resolvePlayerTee(
  playerId: string,
  playerTeeMap: Map<string, TeeBox>,
  roundDefaultTee: TeeBox | null,
): TeeBox | null {
  return playerTeeMap.get(playerId) ?? roundDefaultTee;
}

/**
 * Check if players in a group have different tees (for showing tee dots).
 */
export function hasMultipleTees(
  playerIds: string[],
  playerTeeMap: Map<string, TeeBox>,
  roundDefaultTee: TeeBox | null,
): boolean {
  const teeNames = new Set<string>();
  for (const id of playerIds) {
    const tee = resolvePlayerTee(id, playerTeeMap, roundDefaultTee);
    teeNames.add(tee?.name ?? '');
  }
  return teeNames.size > 1;
}
