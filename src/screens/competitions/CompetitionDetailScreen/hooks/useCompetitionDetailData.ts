/**
 * useCompetitionDetailData
 *
 * Fetches and derives all data needed for the competition detail screen:
 * - Competition details, rounds, players
 * - Leaderboard data
 * - Teams data
 * - Prize pool data + allocation summary
 * - Scoring pairs status
 * - Derived flags (isOrganizer, hasStartedRound, isPrizePoolLocked, currentStanding)
 * - Available tabs
 */

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useCompetitionDetailsData, getCurrentPlayerStanding } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useCompetitionLeaderboard } from '@/hooks/useCompetitionLeaderboard';
import { useTeams } from '@/hooks/useTeams';
import { useCompetitionPrizePool, usePrizePoolPlacements } from '@/hooks/prizePool';
import { scoringPairsKeys } from '@/hooks/queryKeys';
import { getRoundScoringPairs } from '@/services/scoringPairs';

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

  // Get current player's standing (for non-organizers)
  const currentStanding = useMemo(
    () => getCurrentPlayerStanding(leaderboard, user?.id),
    [leaderboard, user?.id]
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
    isOrganizer,
    hasStartedRound,
    isPrizePoolLocked,
    currentStanding,
  };
}
