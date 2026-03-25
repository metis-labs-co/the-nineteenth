/**
 * League React Query Hooks
 *
 * Query and mutation hooks for league operations.
 * Follows existing patterns from useCompetitions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leagueKeys } from './queryKeys';
import {
  getLeagues,
  getLeague,
  getLeaguePlayers,
  getLeagueLeaderboard,
  getPublicLeagues,
  getMyLeagueRounds,
  getPlayerLeagueRounds,
  getEligibleScorecards,
  getLeagueTagsForScorecard,
  getPlayerTagCount,
  getEclecticLeaderboard,
  getEclecticBestScores,
  createLeague,
  joinLeague,
  joinPublicLeague,
  tagRoundToLeague,
  untagRound,
  leaveLeague,
  removePlayer,
  addPlayersToLeague,
  archiveLeague,
  deleteLeague,
  updateLeague,
} from '@/services/api/leagues';
import {
  getLadderStandings,
  getLeagueChallenges,
  getMyActiveChallenges,
  getChallenge,
  createChallenge,
  respondToChallenge,
  submitChallengeRound,
  cancelChallenge,
} from '@/services/api/ladderChallenges';
import type { CreateLeagueInput } from '@/services/api/leagues';
import type { League } from '@/types/database';

// =====================================================
// QUERY HOOKS
// =====================================================

export function useLeagues() {
  return useQuery({
    queryKey: leagueKeys.lists(),
    queryFn: getLeagues,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeague(id: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.detail(id),
    queryFn: () => getLeague(id),
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicLeagues(search?: string) {
  return useQuery({
    queryKey: leagueKeys.publicList(search),
    queryFn: () => getPublicLeagues(search),
    staleTime: 2 * 60 * 1000,
  });
}

export function useLeaguePlayers(leagueId: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.players(leagueId),
    queryFn: () => getLeaguePlayers(leagueId),
    enabled: !!leagueId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeagueLeaderboard(leagueId: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.leaderboard(leagueId),
    queryFn: () => getLeagueLeaderboard(leagueId),
    enabled: !!leagueId && enabled,
    staleTime: 2 * 60 * 1000, // Refresh more often
  });
}

export function useMyLeagueRounds(leagueId: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.rounds(leagueId),
    queryFn: () => getMyLeagueRounds(leagueId),
    enabled: !!leagueId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlayerLeagueRounds(leagueId: string, playerId: string | null) {
  return useQuery({
    queryKey: leagueKeys.playerRounds(leagueId, playerId ?? ''),
    queryFn: () => getPlayerLeagueRounds(leagueId, playerId!),
    enabled: !!leagueId && !!playerId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useEligibleScorecards(leagueId: string, league?: League | null, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.eligibleScorecards(leagueId),
    queryFn: () => getEligibleScorecards(leagueId, league),
    enabled: !!leagueId && enabled,
  });
}

export function useScorecardLeagueTags(scorecardId: string | undefined) {
  return useQuery({
    queryKey: leagueKeys.scorecardTags(scorecardId ?? ''),
    queryFn: () => getLeagueTagsForScorecard(scorecardId!),
    enabled: !!scorecardId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlayerTagCount(leagueId: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.tagCount(leagueId),
    queryFn: () => getPlayerTagCount(leagueId),
    enabled: !!leagueId && enabled,
    staleTime: 2 * 60 * 1000,
  });
}

// =====================================================
// LADDER QUERY HOOKS
// =====================================================

export function useLadderStandings(leagueId: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.ladderStandings(leagueId),
    queryFn: () => getLadderStandings(leagueId),
    enabled: !!leagueId && enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useLeagueChallenges(leagueId: string, status?: string[], enabled = true) {
  return useQuery({
    queryKey: leagueKeys.challenges(leagueId),
    queryFn: () => getLeagueChallenges(leagueId, status),
    enabled: !!leagueId && enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyActiveChallenges(leagueId: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.myChallenges(leagueId),
    queryFn: () => getMyActiveChallenges(leagueId),
    enabled: !!leagueId && enabled,
    staleTime: 60 * 1000,
  });
}

export function useChallenge(challengeId: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.challenge(challengeId),
    queryFn: () => getChallenge(challengeId),
    enabled: !!challengeId && enabled,
    staleTime: 60 * 1000,
  });
}

// =====================================================
// ECLECTIC QUERY HOOKS
// =====================================================

export function useEclecticLeaderboard(leagueId: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.eclecticLeaderboard(leagueId),
    queryFn: () => getEclecticLeaderboard(leagueId),
    enabled: !!leagueId && enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useEclecticBestScores(leagueId: string, playerId?: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.eclecticBestScores(leagueId, playerId),
    queryFn: () => getEclecticBestScores(leagueId, playerId),
    enabled: !!leagueId && enabled,
    staleTime: 2 * 60 * 1000,
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

export function useCreateLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLeagueInput) => createLeague(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.all });
    },
    onError: (error) => {
      console.error('[useCreateLeague] Failed:', error);
    },
  });
}

export function useJoinLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteCode: string) => joinLeague(inviteCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.all });
    },
    onError: (error) => {
      console.error('[useJoinLeague] Failed:', error);
    },
  });
}

export function useJoinPublicLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leagueId: string) => joinPublicLeague(leagueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.all });
    },
    onError: (error) => {
      console.error('[useJoinPublicLeague] Failed:', error);
    },
  });
}

export function useTagRoundToLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leagueId, scorecardId }: { leagueId: string; scorecardId: string }) =>
      tagRoundToLeague(leagueId, scorecardId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.leaderboard(variables.leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.rounds(variables.leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.eligibleScorecards(variables.leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.scorecardTags(variables.scorecardId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.tagCount(variables.leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.eclecticLeaderboard(variables.leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.eclecticBestScores(variables.leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.stats(variables.leagueId) });
    },
    onError: (error) => {
      console.error('[useTagRoundToLeague] Failed:', error);
    },
  });
}

export function useUntagRound(leagueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leagueRoundId: string) => untagRound(leagueRoundId, leagueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.leaderboard(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.rounds(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.eligibleScorecards(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.tagCount(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.stats(leagueId) });
    },
    onError: (error) => {
      console.error('[useUntagRound] Failed:', error);
    },
  });
}

export function useLeaveLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leagueId: string) => leaveLeague(leagueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.all });
    },
    onError: (error) => {
      console.error('[useLeaveLeague] Failed:', error);
    },
  });
}

export function useRemoveLeaguePlayer(leagueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playerId: string) => removePlayer(leagueId, playerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.players(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.leaderboard(leagueId) });
    },
    onError: (error) => {
      console.error('[useRemoveLeaguePlayer] Failed:', error);
    },
  });
}

export function useAddLeaguePlayers(leagueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playerIds: string[]) => addPlayersToLeague(leagueId, playerIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.players(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.leaderboard(leagueId) });
    },
    onError: (error) => {
      console.error('[useAddLeaguePlayers] Failed:', error);
    },
  });
}

export function useDeleteLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leagueId: string) => deleteLeague(leagueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.all });
    },
    onError: (error) => {
      console.error('[useDeleteLeague] Failed:', error);
    },
  });
}

export function useArchiveLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leagueId: string) => archiveLeague(leagueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.all });
    },
    onError: (error) => {
      console.error('[useArchiveLeague] Failed:', error);
    },
  });
}

export function useUpdateLeague(leagueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name?: string; description?: string; is_public?: boolean }) =>
      updateLeague(leagueId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.detail(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.lists() });
    },
    onError: (error) => {
      console.error('[useUpdateLeague] Failed:', error);
    },
  });
}

// =====================================================
// LADDER MUTATION HOOKS
// =====================================================

export function useCreateChallenge(leagueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (challengedPlayerId: string) => createChallenge(leagueId, challengedPlayerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.ladderStandings(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.challenges(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.myChallenges(leagueId) });
    },
    onError: (error) => {
      console.error('[useCreateChallenge] Failed:', error);
    },
  });
}

export function useRespondToChallenge(leagueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ challengeId, accept }: { challengeId: string; accept: boolean }) =>
      respondToChallenge(challengeId, accept),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.ladderStandings(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.challenges(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.myChallenges(leagueId) });
    },
    onError: (error) => {
      console.error('[useRespondToChallenge] Failed:', error);
    },
  });
}

export function useSubmitChallengeRound(leagueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ challengeId, scorecardId }: { challengeId: string; scorecardId: string }) =>
      submitChallengeRound(challengeId, scorecardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.ladderStandings(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.challenges(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.myChallenges(leagueId) });
    },
    onError: (error) => {
      console.error('[useSubmitChallengeRound] Failed:', error);
    },
  });
}

export function useCancelChallenge(leagueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (challengeId: string) => cancelChallenge(challengeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.ladderStandings(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.challenges(leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.myChallenges(leagueId) });
    },
    onError: (error) => {
      console.error('[useCancelChallenge] Failed:', error);
    },
  });
}
