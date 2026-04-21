/**
 * TanStack Query Key Definitions
 *
 * Centralized query key management for type-safe cache invalidation
 * and query organization.
 *
 * Pattern: Use functions that return const arrays for type inference
 * @see https://tanstack.com/query/latest/docs/react/guides/query-keys
 */

import { authKeys } from './auth';
import { competitionKeys, playerKeys, teamKeys, pairingKeys, knockoutKeys, competitionDetailsKeys } from './competition';
import { clubKeys, courseKeys, teeKeys, coordinateKeys, favoriteKeys } from './course';
import { roundKeys, subMatchKeys } from './round';
import { scorecardKeys, leaderboardKeys, scoringPairsKeys, statisticsKeys, scoreMismatchKeys } from './scoring';
import { friendsKeys, notificationKeys, pushKeys, placeholderPlayersKeys } from './social';
import { skinsKeys, wolfKeys, prizePoolKeys, achievementKeys, cosmeticKeys, leagueKeys, subscriptionKeys, aiKeys } from './features';

// Domain-specific query key exports
export { authKeys };

export {
  competitionKeys,
  competitionDetailsKeys,
  playerKeys,
  teamKeys,
  pairingKeys,
  knockoutKeys,
};

export {
  clubKeys,
  courseKeys,
  teeKeys,
  coordinateKeys,
  favoriteKeys,
};

export { roundKeys, subMatchKeys };

export {
  scorecardKeys,
  leaderboardKeys,
  scoringPairsKeys,
  statisticsKeys,
  scoreMismatchKeys,
};

export {
  friendsKeys,
  notificationKeys,
  pushKeys,
  placeholderPlayersKeys,
};

export {
  skinsKeys,
  wolfKeys,
  prizePoolKeys,
  achievementKeys,
  cosmeticKeys,
  leagueKeys,
  subscriptionKeys,
  aiKeys,
};

// =====================================================
// HELPER TYPES
// =====================================================

/**
 * Extract query key type from a key factory function
 *
 * Example:
 * type CompetitionDetailKey = QueryKey<typeof competitionKeys.detail>
 * // ['competitions', 'detail', string]
 */
export type QueryKey<T extends (...args: unknown[]) => readonly unknown[]> = ReturnType<T>;

// =====================================================
// ALL QUERY KEYS (for invalidating everything)
// =====================================================

/**
 * All query keys (for invalidating everything)
 */
export const allQueryKeys = [
  authKeys.all,
  competitionKeys.all,
  roundKeys.all,
  subMatchKeys.all,
  clubKeys.all,
  favoriteKeys.all,
  coordinateKeys.all,
  teeKeys.all,
  courseKeys.all,
  playerKeys.all,
  scorecardKeys.all,
  leaderboardKeys.all,
  teamKeys.all,
  pairingKeys.all,
  scoringPairsKeys.all,
  statisticsKeys.all,
  friendsKeys.all,
  notificationKeys.all,
  subscriptionKeys.all,
  aiKeys.all,
  pushKeys.all,
  placeholderPlayersKeys.all,
  achievementKeys.all,
  cosmeticKeys.all,
  prizePoolKeys.all,
  skinsKeys.all,
  wolfKeys.all,
  scoreMismatchKeys.all,
  knockoutKeys.all,
  leagueKeys.all,
] as const;
