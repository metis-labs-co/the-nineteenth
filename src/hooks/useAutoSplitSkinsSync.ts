/**
 * useAutoSplitSkinsSync Hook
 *
 * Monitors competition state and triggers auto-split skins creation
 * when conditions are met (auto_split_skins enabled, 2+ players, scheduled rounds).
 *
 * This hook is designed to be used on screens that display competition details,
 * automatically creating skins games when:
 * - Prize pool has auto_split_skins = true
 * - skins_pot_per_round > 0
 * - Competition has 2+ players
 * - At least 1 upcoming round exists
 * - No skins games have been created yet for those rounds
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useCompetitionPrizePool } from '@/hooks/usePrizePool';
import { useAutoSplitSkinsForCompetition } from '@/hooks/useSkins';
import { useAuth } from '@/hooks/useAuth';
import { skinsKeys, roundKeys, prizePoolKeys } from '@/hooks/queryKeys';

// =====================================================
// TYPES
// =====================================================

/**
 * Result from triggering auto-split skins creation
 */
export interface AutoSplitTriggerResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Number of skins games created */
  gamesCreated: number;
  /** Total amount drawn from the prize pool */
  totalDrawn: number;
  /** IDs of the created games */
  gameIds: string[];
  /** Error message if failed */
  error?: string;
}

/**
 * Return type for useAutoSplitSkinsSync hook
 */
export interface UseAutoSplitSkinsSyncReturn {
  /** Whether all conditions are met to trigger auto-split */
  shouldTrigger: boolean;
  /** Function to trigger auto-split skins creation */
  triggerAutoSplit: () => Promise<AutoSplitTriggerResult | null>;
  /** Whether creation is in progress */
  isCreating: boolean;
  /** Whether data is loading */
  isLoading: boolean;
  /** Amount allocated per round */
  potPerRound: number;
  /** Number of scheduled rounds */
  roundCount: number;
  /** Number of existing skins games (pool-sourced) */
  skinsGamesCreated: number;
  /** Number of players in competition */
  playerCount: number;
  /** Error message if any */
  error: string | null;
}

// =====================================================
// HOOK
// =====================================================

/**
 * Hook to monitor competition state and trigger auto-split skins creation
 *
 * @param competitionId - Competition UUID to monitor
 * @returns Object with trigger state and function
 *
 * @example
 * ```tsx
 * function CompetitionDetails({ competitionId }: Props) {
 *   const {
 *     shouldTrigger,
 *     triggerAutoSplit,
 *     isCreating,
 *     potPerRound,
 *     roundCount,
 *     skinsGamesCreated,
 *   } = useAutoSplitSkinsSync(competitionId);
 *
 *   const hasTriggeredRef = useRef(false);
 *
 *   useEffect(() => {
 *     if (shouldTrigger && !hasTriggeredRef.current && !isCreating) {
 *       hasTriggeredRef.current = true;
 *       triggerAutoSplit().then((result) => {
 *         if (result?.success && result.gamesCreated > 0) {
 *           showToast(`${result.gamesCreated} skins games created`);
 *         }
 *       });
 *     }
 *   }, [shouldTrigger, isCreating, triggerAutoSplit]);
 *
 *   return <View>...</View>;
 * }
 * ```
 */
export function useAutoSplitSkinsSync(
  competitionId: string | undefined
): UseAutoSplitSkinsSyncReturn {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Fetch prize pool configuration
  const { data: prizePool, isLoading: poolLoading } = useCompetitionPrizePool(competitionId);

  // Get auto-split functions
  const { createAutoSplitSkins, isCreating } = useAutoSplitSkinsForCompetition();

  // Fetch competition data (players and rounds)
  const { data: competitionData, isLoading: compLoading } = useQuery({
    queryKey: ['autoSplitSkinsSync', competitionId],
    queryFn: async () => {
      if (!competitionId) {
        return { playerCount: 0, upcomingRounds: [], existingGames: 0 };
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

      // Fetch upcoming rounds
      const { data: rounds, error: roundsError } = await supabase
        .from('rounds')
        .select('id, round_number, status')
        .eq('competition_id', competitionId)
        .eq('status', 'upcoming')
        .order('round_number', { ascending: true });

      if (roundsError) {
        console.error('[useAutoSplitSkinsSync] Failed to fetch rounds:', roundsError);
      }

      const upcomingRounds = rounds ?? [];

      // If no upcoming rounds, no need to check for existing games
      if (upcomingRounds.length === 0) {
        return { playerCount: playerCount ?? 0, upcomingRounds: [], existingGames: 0 };
      }

      // Fetch existing skins games (pool-sourced) for these rounds
      const { data: existingGames, error: gamesError } = await supabase
        .from('skins_games')
        .select('id, round_id')
        .in(
          'round_id',
          upcomingRounds.map((r) => r.id)
        )
        .eq('pool_source', 'prize_pool')
        .neq('status', 'cancelled');

      if (gamesError) {
        console.error('[useAutoSplitSkinsSync] Failed to fetch existing games:', gamesError);
      }

      return {
        playerCount: playerCount ?? 0,
        upcomingRounds,
        existingGames: existingGames?.length ?? 0,
      };
    },
    enabled: !!competitionId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Calculate derived values
  const potPerRound = prizePool?.skins_pot_per_round ?? 0;
  const roundCount = competitionData?.upcomingRounds?.length ?? 0;
  const skinsGamesCreated = competitionData?.existingGames ?? 0;
  const playerCount = competitionData?.playerCount ?? 0;

  // Determine if we should trigger auto-split
  const shouldTrigger = useMemo(() => {
    // All conditions must be met:
    // 1. Prize pool exists with auto_split_skins enabled
    // 2. skins_pot_per_round > 0
    // 3. At least 2 players
    // 4. At least 1 upcoming round
    // 5. No existing pool-sourced skins games for upcoming rounds
    return (
      !!prizePool &&
      prizePool.auto_split_skins === true &&
      potPerRound > 0 &&
      playerCount >= 2 &&
      roundCount > 0 &&
      skinsGamesCreated === 0
    );
  }, [prizePool, potPerRound, playerCount, roundCount, skinsGamesCreated]);

  // Trigger function
  const triggerAutoSplit = useCallback(async (): Promise<AutoSplitTriggerResult | null> => {
    if (!competitionId || !prizePool || !user?.id) {
      setError('Missing required data for auto-split');
      return null;
    }

    if (playerCount < 2) {
      setError('Need at least 2 players for skins games');
      return null;
    }

    if (roundCount === 0) {
      setError('No upcoming rounds available');
      return null;
    }

    setError(null);

    try {
      const result = await createAutoSplitSkins({
        competitionId,
        poolId: prizePool.id,
        potPerRound,
        scoringType: 'gross',
        createdBy: user.id,
      });

      if (result.success) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: skinsKeys.all });
        queryClient.invalidateQueries({ queryKey: roundKeys.list(competitionId) });
        queryClient.invalidateQueries({ queryKey: prizePoolKeys.balance(prizePool.id) });
        queryClient.invalidateQueries({ queryKey: prizePoolKeys.transactions(prizePool.id) });
        queryClient.invalidateQueries({ queryKey: ['autoSplitSkinsSync', competitionId] });

        return {
          success: true,
          gamesCreated: result.gamesCreated,
          totalDrawn: result.totalDrawn,
          gameIds: result.gameIds,
        };
      } else {
        setError(result.error ?? 'Failed to create skins games');
        return {
          success: false,
          gamesCreated: 0,
          totalDrawn: 0,
          gameIds: [],
          error: result.error,
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[useAutoSplitSkinsSync] Error:', err);
      return {
        success: false,
        gamesCreated: 0,
        totalDrawn: 0,
        gameIds: [],
        error: errorMessage,
      };
    }
  }, [
    competitionId,
    prizePool,
    user?.id,
    playerCount,
    roundCount,
    potPerRound,
    createAutoSplitSkins,
    queryClient,
  ]);

  return {
    shouldTrigger,
    triggerAutoSplit,
    isCreating,
    isLoading: poolLoading || compLoading,
    potPerRound,
    roundCount,
    skinsGamesCreated,
    playerCount,
    error,
  };
}
