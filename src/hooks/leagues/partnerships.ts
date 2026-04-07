/**
 * Partnership League React Query Hooks
 *
 * Query and mutation hooks for partnership league operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leagueKeys } from '../queryKeys';
import {
  getPartnerships,
  getMyPartnership,
  getPartnershipLeaderboard,
  getPartnershipCourseBests,
  getPartnershipRounds,
  createPartnership,
  dissolvePartnership,
  updatePartnershipName,
  tagPartnershipRound,
  untagPartnershipRound,
} from '@/services/api/partnershipLeagues';
import type { TagPartnershipRoundInput } from '@/services/api/partnershipLeagues';

// =====================================================
// QUERY HOOKS
// =====================================================

export function usePartnerships(leagueId: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.partnerships(leagueId),
    queryFn: () => getPartnerships(leagueId),
    enabled: !!leagueId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyPartnership(leagueId: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.myPartnership(leagueId),
    queryFn: () => getMyPartnership(leagueId),
    enabled: !!leagueId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePartnershipLeaderboard(leagueId: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.partnershipLeaderboard(leagueId),
    queryFn: () => getPartnershipLeaderboard(leagueId),
    enabled: !!leagueId && enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePartnershipCourseBests(leagueId: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.partnershipCourseBests(leagueId),
    queryFn: () => getPartnershipCourseBests(leagueId),
    enabled: !!leagueId && enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePartnershipRounds(partnershipId: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.partnershipRounds(partnershipId),
    queryFn: () => getPartnershipRounds(partnershipId),
    enabled: !!partnershipId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

export function useCreatePartnership(leagueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (partnerId: string) => createPartnership(leagueId, partnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.partnerships(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.myPartnership(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.partnershipLeaderboard(leagueId) });
    },
    onError: (error) => {
      console.error('[useCreatePartnership] Failed:', error);
    },
  });
}

export function useDissolvePartnership(leagueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (partnershipId: string) => dissolvePartnership(partnershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.partnerships(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.myPartnership(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.partnershipLeaderboard(leagueId) });
    },
    onError: (error) => {
      console.error('[useDissolvePartnership] Failed:', error);
    },
  });
}

export function useUpdatePartnershipName(leagueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ partnershipId, name }: { partnershipId: string; name: string }) =>
      updatePartnershipName(partnershipId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.myPartnership(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.partnerships(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.partnershipLeaderboard(leagueId) });
    },
    onError: (error) => {
      console.error('[useUpdatePartnershipName] Failed:', error);
    },
  });
}

export function useTagPartnershipRound(leagueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TagPartnershipRoundInput) => tagPartnershipRound(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.partnershipLeaderboard(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.partnershipCourseBests(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.partnershipRounds(variables.partnershipId) });
    },
    onError: (error) => {
      console.error('[useTagPartnershipRound] Failed:', error);
    },
  });
}

export function useUntagPartnershipRound(leagueId: string, partnershipId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roundId: string) => untagPartnershipRound(roundId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.partnershipLeaderboard(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.partnershipCourseBests(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.partnershipRounds(partnershipId) });
    },
    onError: (error) => {
      console.error('[useUntagPartnershipRound] Failed:', error);
    },
  });
}
