/**
 * Knockout Bracket React Query Hooks
 *
 * Query and mutation hooks for knockout tournament operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { knockoutKeys, competitionKeys } from './queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { useCheckAchievements } from '@/hooks/achievements/useCheckAchievements';
import { useAchievementToast } from '@/context/AchievementToastContext';
import {
  getKnockoutBracket,
  getKnockoutMatch,
  generateBracket,
  completeMatch,
  resetBracket,
} from '@/services/api/knockout';
import type { GenerateBracketInput, CompleteMatchInput } from '@/services/api/knockout';
import { organizeBracketData } from '@/utils/bracketGeneration';
import { useMemo } from 'react';
import type { BracketData } from '@/types/database';

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Fetch and organize knockout bracket data for a competition
 */
export function useKnockoutBracket(competitionId: string, playerCount = 0, enabled = true) {
  const query = useQuery({
    queryKey: knockoutKeys.bracket(competitionId),
    queryFn: () => getKnockoutBracket(competitionId),
    enabled: !!competitionId && enabled,
    staleTime: 2 * 60 * 1000,
  });

  const bracketData: BracketData | null = useMemo(() => {
    if (!query.data || query.data.length === 0 || !playerCount) return null;
    return organizeBracketData(query.data, playerCount);
  }, [query.data, playerCount]);

  return {
    ...query,
    bracketData,
  };
}

/**
 * Fetch a single knockout match with player details
 */
export function useKnockoutMatch(matchId: string, enabled = true) {
  return useQuery({
    queryKey: knockoutKeys.match(matchId),
    queryFn: () => getKnockoutMatch(matchId),
    enabled: !!matchId && enabled,
    staleTime: 2 * 60 * 1000,
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Generate the knockout bracket
 */
export function useGenerateBracket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: GenerateBracketInput) => generateBracket(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: knockoutKeys.bracket(variables.competitionId) });
      queryClient.invalidateQueries({ queryKey: competitionKeys.detail(variables.competitionId) });
    },
    onError: (error) => {
      console.error('[useGenerateBracket] Failed:', error);
    },
  });
}

/**
 * Complete a knockout match (set winner and advance)
 */
export function useCompleteKnockoutMatch(competitionId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { checkAndAward, isReady: isAchievementReady } = useCheckAchievements(user?.id ?? '');
  const { showMultipleToasts } = useAchievementToast();

  return useMutation({
    mutationFn: (input: CompleteMatchInput) => completeMatch(input),
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: knockoutKeys.bracket(competitionId) });
      queryClient.invalidateQueries({ queryKey: knockoutKeys.match(variables.matchId) });

      // Fire knockout_match_won achievement if current player won
      if (user?.id && isAchievementReady && variables.winnerId === user.id) {
        try {
          const r = await checkAndAward('knockout_match_won', {
            knockout_match_result: 'win',
          });
          if (r.hasNewRewards) showMultipleToasts(r.newAchievements, r.newCosmetics);
        } catch (error) {
          console.warn('[useCompleteKnockoutMatch] Achievement check failed (non-blocking):', error);
        }
      }
    },
    onError: (error) => {
      console.error('[useCompleteKnockoutMatch] Failed:', error);
    },
  });
}

/**
 * Reset the knockout bracket
 */
export function useResetBracket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (competitionId: string) => resetBracket(competitionId),
    onSuccess: (_data, competitionId) => {
      queryClient.invalidateQueries({ queryKey: knockoutKeys.bracket(competitionId) });
      queryClient.invalidateQueries({ queryKey: competitionKeys.detail(competitionId) });
    },
    onError: (error) => {
      console.error('[useResetBracket] Failed:', error);
    },
  });
}
