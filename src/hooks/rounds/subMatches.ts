/**
 * TanStack Query hooks for Sub-Matches
 *
 * Sub-matches are the unit of scoring within a Ryder-Cup-style split
 * team round. Each sub-match is an independent head-to-head whose
 * result contributes Ryder-Cup points (1 win / 0.5 halved / 0 loss)
 * to the round-level team total.
 *
 * Hooks:
 * - useSubMatches(roundId)          — fetch all sub-matches for a round
 * - useReplaceSubMatches()          — replace entire sub-match set (auto-generate flow)
 * - useUpdateSubMatchResult()       — mark a sub-match complete with its result
 * - useUpdateSubMatchTeeTime()      — override a single sub-match's tee time
 * - useDeleteAllSubMatches()        — clear sub-matches (switch split → combined)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  subMatchKeys,
  roundKeys,
  skinsKeys,
  competitionDetailsKeys,
  leaderboardKeys,
} from '@/hooks/queryKeys';
import { supabase } from '@/services/supabase/client';
import { refinalizeRoundResults } from '@/services/rounds/refinalizeRoundResults';
import { finalizeRoundStatus } from '@/services/rounds/finalizeRoundStatus';
import {
  listSubMatchesForRound,
  replaceSubMatches,
  updateSubMatchResult,
  updateSubMatchTeeTime,
  deleteAllSubMatchesForRound,
  type ReplaceSubMatchesInput,
  type UpdateSubMatchResultInput,
  type UpdateSubMatchTeeTimeInput,
} from '@/services/subMatches';
import { finalizeSkinsForSubMatch } from '@/services/skins/finalizeForSubMatch';
import type { SubMatch } from '@/types';

export function useSubMatches(roundId: string | undefined) {
  return useQuery({
    queryKey: subMatchKeys.list(roundId || ''),
    queryFn: async (): Promise<SubMatch[]> => {
      if (!roundId) return [];
      return listSubMatchesForRound(roundId);
    },
    enabled: !!roundId,
    staleTime: 60 * 1000,
  });
}

export function useReplaceSubMatches() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReplaceSubMatchesInput) => replaceSubMatches(input),
    onSuccess: (_, { roundId }) => {
      queryClient.invalidateQueries({ queryKey: subMatchKeys.list(roundId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
    },
  });
}

export function useUpdateSubMatchResult(roundId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSubMatchResultInput) => updateSubMatchResult(input),
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: subMatchKeys.list(roundId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });

      // When the sub-match is marked complete or forfeit, finalize any
      // active sub-match skins game so payouts are computed alongside the
      // match result. Best-effort — failures are logged, not surfaced.
      if (variables.status === 'completed' || variables.status === 'forfeited') {
        const result = await finalizeSkinsForSubMatch(variables.subMatchId);
        if (result.error) {
          console.warn('[useUpdateSubMatchResult] sub-match skins finalize failed:', result.error);
        }
        if (result.finalized) {
          queryClient.invalidateQueries({
            queryKey: skinsKeys.gamesBySubMatch(variables.subMatchId),
          });
          queryClient.invalidateQueries({
            queryKey: skinsKeys.activeGameBySubMatch(variables.subMatchId),
          });
        }

        // A terminal sub-match changes the round's standings (and may finish the
        // round). Re-finalize the round's results, then complete the round if
        // every sub-match is now terminal — and refresh the COMPETITION-scoped
        // caches. Without this the competition leaderboard stays stale and the
        // round card keeps its score button enabled after the round is done.
        try {
          await refinalizeRoundResults(roundId);
        } catch (err) {
          console.warn('[useUpdateSubMatchResult] refinalize round results failed:', err);
        }
        try {
          await finalizeRoundStatus(roundId);
        } catch (err) {
          console.warn('[useUpdateSubMatchResult] round status finalize failed:', err);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
        const { data: roundRow } = await (supabase.from('rounds') as any)
          .select('competition_id')
          .eq('id', roundId)
          .maybeSingle();
        const competitionId: string | null | undefined = roundRow?.competition_id;

        queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
        queryClient.invalidateQueries({ queryKey: leaderboardKeys.round(roundId) });
        if (competitionId) {
          queryClient.invalidateQueries({
            queryKey: competitionDetailsKeys.detail(competitionId),
          });
          queryClient.invalidateQueries({
            queryKey: leaderboardKeys.competition(competitionId),
          });
        }
      }
    },
  });
}

export function useUpdateSubMatchTeeTime(roundId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSubMatchTeeTimeInput) => updateSubMatchTeeTime(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subMatchKeys.list(roundId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
    },
  });
}

export function useDeleteAllSubMatches() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roundId: string) => deleteAllSubMatchesForRound(roundId),
    onSuccess: (_, roundId) => {
      queryClient.invalidateQueries({ queryKey: subMatchKeys.list(roundId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
    },
  });
}
