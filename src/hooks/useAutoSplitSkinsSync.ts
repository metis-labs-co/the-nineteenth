/**
 * useAutoSplitSkinsSync Hook
 *
 * Provides status information about auto-split skins configuration for a competition.
 * This is a read-only hook that exposes pot/round info for display purposes.
 *
 * Auto-split skins creation is now handled automatically by:
 * - usePrizePool mutations (on pool save)
 * - useAddRoundForm (on round add)
 * - useDeleteRound/useRoundActions (on round delete)
 *
 * These mutations call the `redistribute_skins_pots` RPC which handles all
 * skins game creation and pot redistribution.
 *
 * @deprecated This hook is simplified and will be removed in a future version.
 * Use useCompetitionPrizePool directly for prize pool status.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useCompetitionPrizePool } from '@/hooks/usePrizePool';

// =====================================================
// TYPES
// =====================================================

/**
 * Return type for useAutoSplitSkinsSync hook
 */
export interface UseAutoSplitSkinsSyncReturn {
  /** Whether data is loading */
  isLoading: boolean;
  /** Amount allocated per round */
  potPerRound: number;
  /** Number of upcoming rounds */
  roundCount: number;
  /** Number of existing skins games (pool-sourced) */
  skinsGamesCreated: number;
  /** Number of players in competition */
  playerCount: number;
}

// =====================================================
// HOOK
// =====================================================

/**
 * Hook to get auto-split skins status information for a competition.
 * This is a read-only hook for display purposes only.
 *
 * @param competitionId - Competition UUID
 * @returns Object with pot/round/player info
 *
 * @deprecated This hook is simplified and may be removed. Consider using
 * useCompetitionPrizePool directly for prize pool status.
 *
 * @example
 * ```tsx
 * function CompetitionDetails({ competitionId }: Props) {
 *   const { potPerRound, roundCount, skinsGamesCreated } = useAutoSplitSkinsSync(competitionId);
 *
 *   return (
 *     <Text>
 *       {skinsGamesCreated} skins games created at ${potPerRound} each
 *     </Text>
 *   );
 * }
 * ```
 */
export function useAutoSplitSkinsSync(
  competitionId: string | undefined
): UseAutoSplitSkinsSyncReturn {
  // Fetch prize pool configuration
  const { data: prizePool, isLoading: poolLoading } = useCompetitionPrizePool(competitionId);

  // Fetch competition data (players and rounds)
  const { data: competitionData, isLoading: compLoading } = useQuery({
    queryKey: ['autoSplitSkinsSync', competitionId],
    queryFn: async () => {
      if (!competitionId) {
        return { playerCount: 0, upcomingRoundCount: 0, existingGames: 0 };
      }

      // Fetch player count
      const { count: playerCount, error: playersError } = await supabase
        .from('competition_players')
        .select('*', { count: 'exact', head: true })
        .eq('competition_id', competitionId)
        .eq('status', 'accepted');

      if (playersError) {
        console.error('[useAutoSplitSkinsSync] Failed to fetch players:', playersError);
      }

      // Fetch upcoming round count
      const { count: roundCount, error: roundsError } = await supabase
        .from('rounds')
        .select('*', { count: 'exact', head: true })
        .eq('competition_id', competitionId)
        .eq('status', 'upcoming');

      if (roundsError) {
        console.error('[useAutoSplitSkinsSync] Failed to fetch rounds:', roundsError);
      }

      const upcomingRoundCount = roundCount ?? 0;

      // If no upcoming rounds, no need to check for existing games
      if (upcomingRoundCount === 0) {
        return { playerCount: playerCount ?? 0, upcomingRoundCount: 0, existingGames: 0 };
      }

      // Count existing skins games (pool-sourced) for this competition's upcoming rounds
      const { count: gamesCount, error: gamesError } = await supabase
        .from('skins_games')
        .select('*, rounds!inner(*)', { count: 'exact', head: true })
        .eq('rounds.competition_id', competitionId)
        .eq('rounds.status', 'upcoming')
        .eq('pool_source', 'prize_pool')
        .neq('status', 'cancelled');

      if (gamesError) {
        console.error('[useAutoSplitSkinsSync] Failed to fetch existing games:', gamesError);
      }

      return {
        playerCount: playerCount ?? 0,
        upcomingRoundCount,
        existingGames: gamesCount ?? 0,
      };
    },
    enabled: !!competitionId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Calculate derived values
  const potPerRound = prizePool?.skins_pot_per_round ?? 0;
  const roundCount = competitionData?.upcomingRoundCount ?? 0;
  const skinsGamesCreated = competitionData?.existingGames ?? 0;
  const playerCount = competitionData?.playerCount ?? 0;

  return {
    isLoading: poolLoading || compLoading,
    potPerRound,
    roundCount,
    skinsGamesCreated,
    playerCount,
  };
}
