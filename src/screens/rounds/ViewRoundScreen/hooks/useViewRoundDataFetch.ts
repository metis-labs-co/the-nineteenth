import { useMemo } from 'react';
import { useRoundDetails, useRoundScorecards, useRoundPlayers } from '@/hooks/useRoundDetails';
import { useRoundLeaderboard } from '@/hooks/useRoundLeaderboard';
import { useCompetitionInfo } from '@/hooks';
import { useScorecardsRealtime } from '@/hooks/scorecard/useScorecardsRealtime';

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

  const { data: competitionInfo, isLoading: isLoadingCompetitionInfo } =
    useCompetitionInfo(competitionId);

  // Realtime: invalidate scorecard / competition leaderboard queries the
  // moment any scorecard for this round changes on the server (typically
  // when another player submits).
  useScorecardsRealtime(roundId, competitionId);

  // Game type flags
  const isMatchPlayRound = round?.game_type === 'match-play' && !round?.is_team_round;
  const isTeamMatchPlayRound = round?.game_type === 'match-play' && round?.is_team_round;
  const isShambleRound = round?.game_type === 'shamble' || round?.team_format === 'shamble';
  const isScrambleRound = round?.game_type === 'scramble' || round?.team_format === 'scramble'
    || round?.game_type === 'alt-shot' || round?.team_format === 'alt-shot';
  const isStrokePlayRound = round?.game_type === 'stroke';
  const isStablefordRound = round?.game_type === 'stableford';
  const isParRound = round?.game_type === 'par';
  // Split round: the round is rendered as a list of independent sub_matches
  // rather than tee-time groups. Two flavours:
  //   - Team split (Ryder Cup): sub_matches aggregated for the round result
  //     (also satisfies isTeamRound).
  //   - Singles split (Singles Match Play): each sub_match is a 1v1; no team
  //     aggregation — the per-match results stand on their own.
  const isSplitRound = round?.round_format === 'split';
  // Team stroke round: best-ball or aggregate team formats that still score
  // per-player into scorecards. Match-play-team uses the Match tab, scramble
  // and shamble have their own dedicated tabs — those are excluded here.
  const isTeamStrokeRound =
    (round?.is_team_round ?? false) &&
    (round?.team_format === 'best-ball' || round?.team_format === 'aggregate');
  // True for any team-format round — drives the unified Teams tab that
  // shows rosters (and, for stroke-based team rounds, the leaderboard).
  const isTeamRound = round?.is_team_round ?? false;

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
    isLoadingCompetitionInfo,

    // Game type flags
    isMatchPlayRound,
    isTeamMatchPlayRound,
    isShambleRound,
    isScrambleRound,
    isStrokePlayRound,
    isStablefordRound,
    isParRound,
    isSplitRound,
    isTeamStrokeRound,
    isTeamRound,

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
