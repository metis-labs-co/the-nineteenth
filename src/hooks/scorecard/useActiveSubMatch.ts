/**
 * useActiveSubMatch Hook
 *
 * Shared lookup for split team rounds: loads sub-matches and resolves
 * the one a given user (or organizer) is scoring. Used by both
 * `ScorecardEntryScreen` (best-ball / scramble / shamble splits) and
 * `TeamMatchPlayScoringScreen` (team match-play splits) so the
 * "find my sub-match" logic doesn't drift between the two.
 *
 * Resolution order:
 *   1. `selectedSubMatchId` (organizer pick) — if it resolves to a real
 *      sub-match, it wins.
 *   2. The sub-match the signed-in player belongs to (`ownSubMatch`).
 *   3. The first sub-match by `sort_order` (organizer fallback when the
 *      signed-in user isn't in any sub-match yet).
 *
 * When `enabled` is false (i.e. round_format !== 'split'), the hook
 * skips fetching entirely and returns empty state — callers should treat
 * `activeSubMatch === null` as "no scope to apply".
 */

import { useMemo } from 'react';
import { useSubMatches } from '@/hooks/rounds';
import type { SubMatch } from '@/types';

interface UseActiveSubMatchParams {
  roundId: string | undefined;
  /** Typically `round_format === 'split'`. Disables the network fetch when false. */
  enabled: boolean;
  /** Player id of the signed-in user — used to find their own sub-match. */
  currentPlayerId: string | undefined;
  /** Organizer pick — overrides own-sub-match lookup when set and matches a real sub-match. */
  selectedSubMatchId?: string | null;
}

interface UseActiveSubMatchResult {
  /** All sub-matches for the round, ordered by sort_order. Empty when disabled. */
  subMatches: SubMatch[];
  /** Sub-match the signed-in player is in, or null. */
  ownSubMatch: SubMatch | null;
  /** Resolved sub-match per the priority above, or null. */
  activeSubMatch: SubMatch | null;
  /**
   * Player ids in the active sub-match (team A ∪ team B). Use as a Set
   * to filter `currentPlayers` / scoring-pair `playersToScore` down to
   * just the players in scope. Null when there's no active sub-match.
   */
  activePlayerIds: Set<string> | null;
  isLoading: boolean;
}

export function useActiveSubMatch({
  roundId,
  enabled,
  currentPlayerId,
  selectedSubMatchId,
}: UseActiveSubMatchParams): UseActiveSubMatchResult {
  const { data, isLoading } = useSubMatches(enabled ? roundId : undefined);
  const subMatches = useMemo(() => data ?? [], [data]);

  const ownSubMatch = useMemo<SubMatch | null>(() => {
    if (!enabled || !currentPlayerId || subMatches.length === 0) return null;
    return (
      subMatches.find(
        (sm) =>
          sm.team_a_player_ids.includes(currentPlayerId) ||
          sm.team_b_player_ids.includes(currentPlayerId)
      ) ?? null
    );
  }, [enabled, currentPlayerId, subMatches]);

  const activeSubMatch = useMemo<SubMatch | null>(() => {
    if (!enabled || subMatches.length === 0) return null;
    if (selectedSubMatchId) {
      const picked = subMatches.find((sm) => sm.id === selectedSubMatchId);
      if (picked) return picked;
    }
    if (ownSubMatch) return ownSubMatch;
    return subMatches[0] ?? null;
  }, [enabled, subMatches, selectedSubMatchId, ownSubMatch]);

  const activePlayerIds = useMemo<Set<string> | null>(() => {
    if (!activeSubMatch) return null;
    return new Set([
      ...activeSubMatch.team_a_player_ids,
      ...activeSubMatch.team_b_player_ids,
    ]);
  }, [activeSubMatch]);

  return {
    subMatches,
    ownSubMatch,
    activeSubMatch,
    activePlayerIds,
    isLoading,
  };
}
