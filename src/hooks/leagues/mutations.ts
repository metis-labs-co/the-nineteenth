/**
 * League Hooks - Mutation Hooks
 *
 * TanStack Query mutation hooks for modifying league data.
 *
 * Hooks:
 * - useCreateLeague: Create a new league
 * - useJoinLeague: Join a league via invite code
 * - useJoinPublicLeague: Join a public league
 * - useTagRoundToLeague: Tag a round scorecard to a league
 * - useUntagRound: Remove a round tag from a league
 * - useLeaveLeague: Leave a league
 * - useRemoveLeaguePlayer: Remove a player from a league
 * - useAddLeaguePlayers: Add players to a league
 * - useDeleteLeague: Delete a league
 * - useArchiveLeague: Archive a league
 * - useUpdateLeague: Update league details
 * - useCreateChallenge: Create a ladder challenge
 * - useRespondToChallenge: Accept or decline a challenge
 * - useSubmitChallengeRound: Submit a round for a challenge
 * - useCancelChallenge: Cancel a challenge
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leagueKeys } from '@/hooks/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { useCheckAchievements } from '@/hooks/achievements/useCheckAchievements';
import { useAchievementToast } from '@/context/AchievementToastContext';
import {
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
  createChallenge,
  respondToChallenge,
  submitChallengeRound,
  cancelChallenge,
} from '@/services/api/ladderChallenges';
import type { CreateLeagueInput } from '@/services/api/leagues';

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
  const { user } = useAuth();
  const { checkAndAward, isReady: isAchievementReady } = useCheckAchievements(user?.id ?? '');
  const { showMultipleToasts } = useAchievementToast();

  return useMutation({
    mutationFn: (inviteCode: string) => joinLeague(inviteCode),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.all });
      if (user?.id && isAchievementReady) {
        try {
          const r = await checkAndAward('league_joined', {});
          if (r.hasNewRewards) showMultipleToasts(r.newAchievements, r.newCosmetics);
        } catch (error) {
          console.warn('[useJoinLeague] Achievement check failed (non-blocking):', error);
        }
      }
    },
    onError: (error) => {
      console.error('[useJoinLeague] Failed:', error);
    },
  });
}

export function useJoinPublicLeague() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { checkAndAward, isReady: isAchievementReady } = useCheckAchievements(user?.id ?? '');
  const { showMultipleToasts } = useAchievementToast();

  return useMutation({
    mutationFn: (leagueId: string) => joinPublicLeague(leagueId),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.all });
      if (user?.id && isAchievementReady) {
        try {
          const r = await checkAndAward('league_joined', {});
          if (r.hasNewRewards) showMultipleToasts(r.newAchievements, r.newCosmetics);
        } catch (error) {
          console.warn('[useJoinPublicLeague] Achievement check failed (non-blocking):', error);
        }
      }
    },
    onError: (error) => {
      console.error('[useJoinPublicLeague] Failed:', error);
    },
  });
}

export function useTagRoundToLeague() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { checkAndAward, isReady: isAchievementReady } = useCheckAchievements(user?.id ?? '');
  const { showMultipleToasts } = useAchievementToast();

  return useMutation({
    mutationFn: ({ leagueId, scorecardId }: { leagueId: string; scorecardId: string }) =>
      tagRoundToLeague(leagueId, scorecardId),
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: leagueKeys.leaderboardBase(variables.leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.rounds(variables.leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.eligibleScorecards(variables.leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.scorecardTags(variables.scorecardId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.tagCount(variables.leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.eclecticLeaderboard(variables.leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.eclecticBestScores(variables.leagueId) });
      queryClient.invalidateQueries({ queryKey: leagueKeys.stats(variables.leagueId) });

      if (user?.id && isAchievementReady) {
        try {
          const r = await checkAndAward('league_round_completed', {
            league_id: variables.leagueId,
          });
          if (r.hasNewRewards) showMultipleToasts(r.newAchievements, r.newCosmetics);
        } catch (error) {
          console.warn('[useTagRoundToLeague] Achievement check failed (non-blocking):', error);
        }
      }
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
      queryClient.invalidateQueries({ queryKey: leagueKeys.leaderboardBase(leagueId) });
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
      queryClient.invalidateQueries({ queryKey: leagueKeys.leaderboardBase(leagueId) });
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
      queryClient.invalidateQueries({ queryKey: leagueKeys.leaderboardBase(leagueId) });
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
