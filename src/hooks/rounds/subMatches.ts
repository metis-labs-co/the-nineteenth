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
import { subMatchKeys, roundKeys } from '@/hooks/queryKeys';
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subMatchKeys.list(roundId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
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
