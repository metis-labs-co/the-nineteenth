/**
 * useCompetitionDetailData
 *
 * Fetches and derives all data needed for the competition detail screen:
 * - Competition details, rounds, players
 * - Leaderboard data (individual + team)
 * - Teams data
 * - Prize pool data + allocation summary
 * - Scoring pairs status
 * - Derived flags (isOrganizer, hasStartedRound, isPrizePoolLocked, isPlayer)
 * - Mini-leaderboard windows (miniIndividual, miniTeam)
 */

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useCompetitionDetailsData } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useCompetitionLeaderboard } from '@/hooks/useCompetitionLeaderboard';
import { useTeams } from '@/hooks/useTeams';
import { useCompetitionPrizePool, usePrizePoolPlacements } from '@/hooks/prizePool';
import { scoringPairsKeys, scorecardKeys } from '@/hooks/queryKeys';
import { getRoundScoringPairs } from '@/services/scoringPairs';
import { supabase } from '@/services/supabase/client';
import {
  getMiniIndividualRows,
  getMiniTeamRows,
  resolveUserTeamId,
} from '@/utils/miniLeaderboard';

export function useCompetitionDetailData(id: string) {
  const { user } = useAuth();

  // Fetch competition details
  const {
    data: competitionData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useCompetitionDetailsData(id);

  // Fetch leaderboard data (individuals filter for current standing)
  const {
    data: leaderboard,
    refetch: refetchLeaderboard,
  } = useCompetitionLeaderboard(id, { filter: 'individuals' });

  // Fetch team leaderboard data for the team mini-leaderboard
  const { data: teamLeaderboard } = useCompetitionLeaderboard(id, {
    filter: 'teams',
  });

  // Fetch teams data
  const {
    data: teams,
    isLoading: isLoadingTeams,
    refetch: refetchTeams,
  } = useTeams(id);

  // Fetch prize pool data
  const {
    data: prizePool,
    refetch: refetchPrizePool,
  } = useCompetitionPrizePool(id);

  // Fetch prize pool placements
  const { data: prizePoolPlacements } = usePrizePoolPlacements(prizePool?.id);

  // Get rounds that require scoring pairs (only when user is organizer)
  const roundsRequiringScoringPairs = useMemo(() => {
    if (!competitionData?.rounds) return [];
    return competitionData.rounds.filter((r) => r.scoring_pairs_required);
  }, [competitionData?.rounds]);

  // Fetch scoring pairs status for rounds that require them
  const scoringPairsQueries = useQueries({
    queries: roundsRequiringScoringPairs.map((round) => ({
      queryKey: scoringPairsKeys.list(round.id),
      queryFn: () => getRoundScoringPairs(round.id),
      enabled: !!round.id,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    })),
  });

  // Build a map of roundId -> hasPairs (true if pairs exist)
  const scoringPairsStatus = useMemo(() => {
    const status: Record<string, boolean> = {};
    roundsRequiringScoringPairs.forEach((round, index) => {
      const query = scoringPairsQueries[index];
      status[round.id] = (query?.data?.length ?? 0) > 0;
    });
    return status;
  }, [roundsRequiringScoringPairs, scoringPairsQueries]);

  // Fetch completed scorecard counts per round
  const allRounds = competitionData?.rounds ?? [];
  const playerCount = competitionData?.players?.length ?? 0;

  const scorecardCountQueries = useQueries({
    queries: allRounds.map((round) => ({
      queryKey: [...scorecardKeys.list({ roundId: round.id }), 'completedCount'],
      queryFn: async () => {
        const { count, error } = await supabase
          .from('scorecards')
          .select('*', { count: 'exact', head: true })
          .eq('round_id', round.id)
          .eq('status', 'completed');
        if (error) throw error;
        return count ?? 0;
      },
      enabled: !!round.id && playerCount > 0,
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
    })),
  });

  // Build map of roundId -> allPlayersScored
  const allScoredStatus = useMemo(() => {
    const status: Record<string, boolean> = {};
    allRounds.forEach((round, index) => {
      const query = scorecardCountQueries[index];
      status[round.id] = playerCount > 0 && (query?.data ?? 0) >= playerCount;
    });
    return status;
  }, [allRounds, scorecardCountQueries, playerCount]);

  // Check if current user is the organizer
  const isOrganizer = useMemo(() => {
    if (!competitionData?.competition || !user) return false;
    return competitionData.competition.organizer_id === user.id;
  }, [competitionData?.competition, user]);

  // Check if any round has started (for prize pool lock status)
  const hasStartedRound = useMemo(() => {
    if (!competitionData?.rounds) return false;
    return competitionData.rounds.some(
      (r) => r.status === 'in-progress' || r.status === 'completed'
    );
  }, [competitionData?.rounds]);

  // Check if prize pool is locked
  const isPrizePoolLocked = useMemo(() => {
    return !!prizePool?.is_locked || hasStartedRound;
  }, [prizePool?.is_locked, hasStartedRound]);

  // Derive whether the current user is a player in this competition
  const isPlayer = useMemo(() => {
    if (!user || !competitionData?.players) return false;
    return competitionData.players.some((p) => p.player_id === user.id);
  }, [competitionData?.players, user]);

  // Resolve current user's team (if any)
  const userTeamId = useMemo(
    () => resolveUserTeamId(teams, user?.id),
    [teams, user?.id]
  );

  const userTeamName = useMemo(() => {
    if (!userTeamId || !teams) return undefined;
    return teams.find((t) => t.id === userTeamId)?.name;
  }, [teams, userTeamId]);

  // Derive 3-row mini-leaderboard windows
  const miniIndividual = useMemo(
    () => getMiniIndividualRows(leaderboard, user?.id),
    [leaderboard, user?.id]
  );

  const miniTeam = useMemo(
    () => getMiniTeamRows(teamLeaderboard, userTeamId),
    [teamLeaderboard, userTeamId]
  );

  return {
    user,
    competitionData,
    isLoading,
    error,
    refetch,
    isRefetching,
    leaderboard,
    refetchLeaderboard,
    teams,
    isLoadingTeams,
    refetchTeams,
    prizePool,
    refetchPrizePool,
    prizePoolPlacements,
    scoringPairsStatus,
    allScoredStatus,
    isOrganizer,
    hasStartedRound,
    isPrizePoolLocked,
    isPlayer,
    userTeamId,
    userTeamName,
    miniIndividual,
    miniTeam,
  };
}
