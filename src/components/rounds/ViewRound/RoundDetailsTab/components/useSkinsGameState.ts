/**
 * useSkinsGameState - Custom hook for skins game state management
 *
 * Handles:
 * - Fetching skins games, payouts, and results for a round
 * - Active game detection (prefer completed > active > first)
 * - Auto-finalization when round completes but game hasn't been finalized
 * - Computed display values (per-hole value, total pot, labels)
 * - Sorted payouts
 */

import { useMemo, useEffect, useRef } from 'react';
import {
  useSkinsGamesByRound,
  useSkinsPayouts,
  useSkinsResults,
  useFinalizeSkinsGame,
  useSkinsHoleCounts,
} from '@/hooks/useSkins';
import { calculateHoleValue, calculatePlayedPot, calculateSettledPot } from '@/utils/skins';
import type { RoundStatus } from '@/types/database/enums';

export interface UseSkinsGameStateParams {
  roundId: string;
  roundStatus: RoundStatus;
}

export function useSkinsGameState({ roundId, roundStatus }: UseSkinsGameStateParams) {
  // Fetch skins games for this round
  const { data: skinsGames, isLoading: isLoadingGames } = useSkinsGamesByRound(roundId);

  // Holes the round's skins are priced (planned) and played over
  const { plannedHoles, holesPlayed } = useSkinsHoleCounts(roundId);

  // Get the active or completed skins game (there should only be one per round)
  const skinsGame = useMemo(() => {
    if (!skinsGames || skinsGames.length === 0) return null;
    // Prefer completed, then active, then the first one
    return (
      skinsGames.find((g) => g.status === 'completed') ||
      skinsGames.find((g) => g.status === 'active') ||
      skinsGames[0]
    );
  }, [skinsGames]);

  // Determine if we should show payouts view (round is completed)
  const showPayoutsView = roundStatus === 'completed' && !!skinsGame;

  // Fetch payouts if round is completed (even if skins game status is still 'active')
  const { data: payouts, isLoading: isLoadingPayouts, refetch: refetchPayouts } = useSkinsPayouts(
    showPayoutsView ? skinsGame.id : undefined
  );

  // Fetch skins results to check if hole data was recorded
  const { data: skinsResults, isLoading: isLoadingResults } = useSkinsResults(
    showPayoutsView ? skinsGame.id : undefined
  );

  // Finalization mutation for auto-finalize
  const { mutateAsync: finalizeGame, isPending: isFinalizing } = useFinalizeSkinsGame();

  // Track if we've attempted auto-finalize to prevent infinite loops
  const hasAttemptedFinalize = useRef(false);

  // Auto-finalize: If round is completed, skins game is active, and we have results but no payouts
  useEffect(() => {
    const shouldAutoFinalize =
      showPayoutsView &&
      skinsGame?.status === 'active' &&
      skinsResults &&
      skinsResults.length > 0 &&
      (!payouts || payouts.length === 0) &&
      !isLoadingPayouts &&
      !isLoadingResults &&
      !isFinalizing &&
      !hasAttemptedFinalize.current;

    if (shouldAutoFinalize) {
      hasAttemptedFinalize.current = true;
      finalizeGame({ gameId: skinsGame.id })
        .then(() => {
          refetchPayouts();
        })
        .catch(() => {
          // Auto-finalize failed silently
        });
    }
  }, [
    showPayoutsView,
    skinsGame?.status,
    skinsGame?.id,
    skinsResults,
    payouts,
    isLoadingPayouts,
    isLoadingResults,
    isFinalizing,
    finalizeGame,
    refetchPayouts,
  ]);

  // Calculate display values. Holes are priced on the planned count; a
  // settled game shows what was actually staked (its stored buy-ins),
  // otherwise the pot for the holes played.
  const displayValues = useMemo(() => {
    if (!skinsGame) {
      return {
        perHoleValue: 0,
        totalPot: 0,
        scoringTypeLabel: '',
        potTypeLabel: '',
      };
    }

    return {
      perHoleValue: calculateHoleValue(skinsGame.pot_type, skinsGame.pot_value, plannedHoles),
      totalPot:
        calculateSettledPot(skinsGame, payouts) ?? calculatePlayedPot(skinsGame, { plannedHoles, holesPlayed }),
      scoringTypeLabel: skinsGame.scoring_type === 'gross' ? 'Gross' : 'Net',
      potTypeLabel: skinsGame.pot_type === 'per_hole' ? 'Per Hole' : 'Total Pot',
    };
  }, [skinsGame, payouts, plannedHoles, holesPlayed]);

  // Sort payouts by winnings (descending)
  const sortedPayouts = useMemo(() => {
    if (!payouts) return [];
    return [...payouts].sort((a, b) => b.total_winnings - a.total_winnings);
  }, [payouts]);

  // Loading state - include results loading and finalization
  const isLoading = isLoadingGames || (showPayoutsView && (isLoadingPayouts || isLoadingResults || isFinalizing));

  return {
    skinsGame,
    skinsResults,
    sortedPayouts,
    isLoading,
    showPayoutsView,
    ...displayValues,
  };
}
