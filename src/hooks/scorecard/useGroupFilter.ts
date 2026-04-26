/**
 * useGroupFilter Hook
 *
 * In rounds with more than one pairing, the signed-in user typically only
 * needs to score for their own playing group (2-4 players). This hook
 * filters `currentPlayers` down to the user's pairing-mates, with an
 * escape hatch to show all players if needed (e.g. someone agrees to
 * mark another group too).
 *
 * Activation rule (all must be true):
 *   1. Scoring pairs (marker mode) is NOT enabled — that flow has its own filter
 *   2. Round has more than 4 players (i.e. multiple pairings exist)
 *   3. The signed-in user is in a pairing
 *
 * If any fail, `canFilter` is false and `groupPlayers` returns all players.
 */

import { useMemo, useState, useCallback } from 'react';
import type { Player, PairingWithPlayers } from '@/types';

interface UseGroupFilterParams {
  currentUserId: string | undefined;
  currentPlayers: Player[];
  pairings: PairingWithPlayers[] | undefined;
  scoringPairsEnabled: boolean;
}

interface UseGroupFilterResult {
  /** Players to render — filtered to the user's group, or all players when toggled/inactive */
  groupPlayers: Player[];
  /** True when the filter is active and currently hiding non-group players */
  isFiltered: boolean;
  /** True when the filter is applicable to this round + user */
  canFilter: boolean;
  /** Total players in the round (for the strip text) */
  totalCount: number;
  /** Player count in the user's group (for the strip text) */
  groupCount: number;
  /** Toggle between "your group" and "all players" */
  toggleShowAll: () => void;
}

const SINGLE_GROUP_THRESHOLD = 4;

export function useGroupFilter({
  currentUserId,
  currentPlayers,
  pairings,
  scoringPairsEnabled,
}: UseGroupFilterParams): UseGroupFilterResult {
  const [showAll, setShowAll] = useState(false);

  const userGroupPlayerIds = useMemo<Set<string> | null>(() => {
    if (scoringPairsEnabled) return null;
    if (currentPlayers.length <= SINGLE_GROUP_THRESHOLD) return null;
    if (!currentUserId || !pairings || pairings.length === 0) return null;

    const userPairing = pairings.find((p) => p.playerIds.includes(currentUserId));
    if (!userPairing) return null;

    return new Set(userPairing.playerIds);
  }, [scoringPairsEnabled, currentPlayers.length, currentUserId, pairings]);

  const canFilter = userGroupPlayerIds !== null;

  const groupPlayers = useMemo(() => {
    if (!canFilter || showAll || !userGroupPlayerIds) return currentPlayers;
    return currentPlayers.filter((p) => userGroupPlayerIds.has(p.id));
  }, [canFilter, showAll, userGroupPlayerIds, currentPlayers]);

  const toggleShowAll = useCallback(() => {
    setShowAll((prev) => !prev);
  }, []);

  return {
    groupPlayers,
    isFiltered: canFilter && !showAll,
    canFilter,
    totalCount: currentPlayers.length,
    groupCount: userGroupPlayerIds?.size ?? currentPlayers.length,
    toggleShowAll,
  };
}
