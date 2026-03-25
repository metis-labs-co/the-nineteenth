import { useMemo } from 'react';
import { useRoundDetails, useRoundScorecards, useRoundPlayers } from '@/hooks/useRoundDetails';
import { useRoundLeaderboard } from '@/hooks/useRoundLeaderboard';
import { useCompetitionInfo } from '@/hooks';

interface UseViewRoundDataFetchParams {
  roundId: string;
  competitionId?: string;
}

export function useViewRoundDataFetch({ roundId, competitionId }: UseViewRoundDataFetchParams) {
  const {
    data: round,
    isLoading: isLoadingRound,
    error: roundError,
    refetch: refetchRound,
    isRefetching: isRefetchingRound,
  } = useRoundDetails(roundId);

  const {
    data: scorecards,
    isLoading: isLoadingScorecards,
    refetch: refetchScorecards,
    isRefetching: isRefetchingScorecards,
  } = useRoundScorecards(roundId);

  const {
    data: roundPlayers,
    isLoading: isLoadingPlayers,
    refetch: refetchPlayers,
    isRefetching: isRefetchingPlayers,
  } = useRoundPlayers(roundId);

  const { data: competitionInfo } = useCompetitionInfo(competitionId);

  // Game type flags
  const isMatchPlayRound = round?.game_type === 'match-play' && !round?.is_team_round;
  const isTeamMatchPlayRound = round?.game_type === 'match-play' && round?.is_team_round;
  const isShambleRound = round?.game_type === 'shamble' || round?.team_format === 'shamble';
  const isScrambleRound = round?.game_type === 'scramble' || round?.team_format === 'scramble';
  const isStrokePlayRound = round?.game_type === 'stroke';

  const {
    data: matchPlayData,
    isLoading: isLoadingMatchPlay,
    refetch: refetchMatchPlay,
    isRefetching: isRefetchingMatchPlay,
  } = useRoundLeaderboard(roundId, { enabled: isMatchPlayRound || isTeamMatchPlayRound });

  const isLoading = isLoadingRound || isLoadingScorecards || isLoadingPlayers || ((isMatchPlayRound || isTeamMatchPlayRound) && isLoadingMatchPlay);
  const isRefreshing = useMemo(
    () => isRefetchingRound || isRefetchingScorecards || isRefetchingPlayers || isRefetchingMatchPlay,
    [isRefetchingRound, isRefetchingScorecards, isRefetchingPlayers, isRefetchingMatchPlay],
  );

  return {
    // Core data
    round,
    roundError,
    scorecards,
    roundPlayers,
    matchPlayData,
    competitionInfo,

    // Game type flags
    isMatchPlayRound,
    isTeamMatchPlayRound,
    isShambleRound,
    isScrambleRound,
    isStrokePlayRound,

    // Loading state
    isLoading,
    isRefreshing,

    // Refetch functions
    refetchRound,
    refetchScorecards,
    refetchPlayers,
    refetchMatchPlay,
  };
}
