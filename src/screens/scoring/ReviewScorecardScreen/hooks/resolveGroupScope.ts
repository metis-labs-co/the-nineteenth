import type { PairingWithPlayers } from '@/types';

/**
 * Resolve the players this device is responsible for submitting (its on-course
 * group / pair). Priority:
 *   1. allowedPlayerIds — set by the scoring screen (toggle-aware effective scope).
 *   2. the user's pairing — robust fallback when the scoring screen hasn't yet
 *      populated allowedPlayerIds (e.g. pairings just resolved). Prevents silently
 *      reverting to the whole field on a multi-group team round.
 *   3. all loaded scorecards — legacy whole-field (single group / standalone).
 */
export function resolveGroupScopeIds(params: {
  allowedPlayerIds: string[];
  pairings: PairingWithPlayers[] | undefined;
  currentUserId: string | undefined;
  groupScorecardPlayerIds: string[];
}): string[] {
  const { allowedPlayerIds, pairings, currentUserId, groupScorecardPlayerIds } = params;
  if (allowedPlayerIds.length > 0) return allowedPlayerIds;
  if (currentUserId && pairings) {
    const userPairing = pairings.find((p) => p.playerIds.includes(currentUserId));
    if (userPairing && userPairing.playerIds.length > 0) return userPairing.playerIds;
  }
  return groupScorecardPlayerIds;
}
