/**
 * League Hooks - Query Hooks
 *
 * TanStack Query hooks for fetching league data.
 *
 * Hooks:
 * - useLeagues: Fetch all leagues for the current user
 * - useLeague: Fetch a single league by ID
 * - usePublicLeagues: Search public leagues
 * - useLeaguePlayers: Fetch players in a league
 * - useLeagueLeaderboard: Fetch leaderboard for a league
 * - useMyLeagueRounds: Fetch current user's rounds in a league
 * - usePlayerLeagueRounds: Fetch a specific player's rounds
 * - useEligibleScorecards: Fetch scorecards eligible for tagging
 * - useScorecardLeagueTags: Fetch league tags for a scorecard
 * - usePlayerTagCount: Fetch player's tag count in a league
 * - useLadderStandings: Fetch ladder standings
 * - useLeagueChallenges: Fetch challenges in a league
 * - useMyActiveChallenges: Fetch current user's active challenges
 * - useChallenge: Fetch a single challenge
 * - useEclecticLeaderboard: Fetch eclectic leaderboard
 * - useEclecticBestScores: Fetch eclectic best scores
 */

import { useQuery } from '@tanstack/react-query';
import { CACHE_TIMES } from '@/constants/cacheConfig';
import { leagueKeys } from '@/hooks/queryKeys';
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
} from '@/services/api/leagues';
import {
  getLadderStandings,
  getLeagueChallenges,
  getMyActiveChallenges,
  getChallenge,
} from '@/services/api/ladderChallenges';
import type { League, LeagueSortMode } from '@/types/database';

// =====================================================
// QUERY HOOKS
// =====================================================

export function useLeagues() {
  return useQuery({
    queryKey: leagueKeys.lists(),
    queryFn: getLeagues,
    staleTime: CACHE_TIMES.STANDARD,
  });
}

export function useLeague(id: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.detail(id),
    queryFn: () => getLeague(id),
    enabled: !!id && enabled,
    staleTime: CACHE_TIMES.STANDARD,
  });
}

export function usePublicLeagues(search?: string) {
  return useQuery({
    queryKey: leagueKeys.publicList(search),
    queryFn: () => getPublicLeagues(search),
    staleTime: CACHE_TIMES.MODERATE,
  });
}

export function useLeaguePlayers(leagueId: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.players(leagueId),
    queryFn: () => getLeaguePlayers(leagueId),
    enabled: !!leagueId && enabled,
    staleTime: CACHE_TIMES.STANDARD,
  });
}

export function useLeagueLeaderboard(leagueId: string, enabled = true, sortMode: LeagueSortMode = 'gross') {
  return useQuery({
    queryKey: leagueKeys.leaderboard(leagueId, sortMode),
    queryFn: () => getLeagueLeaderboard(leagueId, sortMode),
    enabled: !!leagueId && enabled,
    staleTime: CACHE_TIMES.MODERATE, // Refresh more often
  });
}

export function useMyLeagueRounds(leagueId: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.rounds(leagueId),
    queryFn: () => getMyLeagueRounds(leagueId),
    enabled: !!leagueId && enabled,
    staleTime: CACHE_TIMES.STANDARD,
  });
}

export function usePlayerLeagueRounds(leagueId: string, playerId: string | null) {
  return useQuery({
    queryKey: leagueKeys.playerRounds(leagueId, playerId ?? ''),
    queryFn: () => getPlayerLeagueRounds(leagueId, playerId!),
    enabled: !!leagueId && !!playerId,
    staleTime: CACHE_TIMES.MODERATE,
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
    staleTime: CACHE_TIMES.STANDARD,
  });
}

export function usePlayerTagCount(leagueId: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.tagCount(leagueId),
    queryFn: () => getPlayerTagCount(leagueId),
    enabled: !!leagueId && enabled,
    staleTime: CACHE_TIMES.MODERATE,
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
    staleTime: CACHE_TIMES.MODERATE,
  });
}

export function useLeagueChallenges(leagueId: string, status?: string[], enabled = true) {
  return useQuery({
    queryKey: leagueKeys.challenges(leagueId),
    queryFn: () => getLeagueChallenges(leagueId, status),
    enabled: !!leagueId && enabled,
    staleTime: CACHE_TIMES.MODERATE,
  });
}

export function useMyActiveChallenges(leagueId: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.myChallenges(leagueId),
    queryFn: () => getMyActiveChallenges(leagueId),
    enabled: !!leagueId && enabled,
    staleTime: CACHE_TIMES.FREQUENT,
  });
}

export function useChallenge(challengeId: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.challenge(challengeId),
    queryFn: () => getChallenge(challengeId),
    enabled: !!challengeId && enabled,
    staleTime: CACHE_TIMES.FREQUENT,
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
    staleTime: CACHE_TIMES.MODERATE,
  });
}

export function useEclecticBestScores(leagueId: string, playerId?: string, enabled = true) {
  return useQuery({
    queryKey: leagueKeys.eclecticBestScores(leagueId, playerId),
    queryFn: () => getEclecticBestScores(leagueId, playerId),
    enabled: !!leagueId && enabled,
    staleTime: CACHE_TIMES.MODERATE,
  });
}
