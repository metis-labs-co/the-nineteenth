// src/hooks/competitions/useRingerBoard.ts
import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useCompetitionDetailsData } from './queries';
import { getRoundHoles } from '@/services/courses/getRoundHoles';
import { fetchFinishedScorecardsForRound } from '@/services/scorecards/fetchFinishedScorecardsForRound';
import { getCompetitionTeams } from '@/services/teams/teamQueries';
import { ringerKeys } from '@/hooks/queryKeys';
import { computeRingerBoard } from '@/utils/ringer';
import type { RingerBoardResult, RingerRoundInput } from '@/utils/ringer';

interface UseRingerBoardResult {
  board: RingerBoardResult | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/** A single-ball team round (scramble/alt-shot) produces one team ball, not individual scorecards. */
function isScramble(round: { team_format?: string | null; game_type?: string }): boolean {
  return round.team_format === 'scramble' || round.game_type === 'scramble'
    || round.team_format === 'alt-shot' || round.game_type === 'alt-shot';
}

export function useRingerBoard(competitionId: string | undefined): UseRingerBoardResult {
  const {
    data: compData,
    isLoading: compLoading,
    error: compError,
    refetch: refetchComp,
  } = useCompetitionDetailsData(competitionId);

  // Stable labels: number every round by position in the full rounds list,
  // so labels (R1..R4) match what users see even though Scramble is excluded.
  const roundLabelById = useMemo(() => {
    const map: Record<string, string> = {};
    (compData?.rounds ?? []).forEach((r, idx) => {
      map[r.id] = `R${idx + 1}`;
    });
    return map;
  }, [compData]);

  const qualifyingRounds = useMemo(
    () => (compData?.rounds ?? []).filter((r) => !isScramble(r)),
    [compData]
  );

  const scorecardResults = useQueries({
    queries: qualifyingRounds.map((r) => ({
      queryKey: ringerKeys.scorecards(r.id),
      queryFn: () => fetchFinishedScorecardsForRound(r.id),
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
    })),
  });

  const holeResults = useQueries({
    queries: qualifyingRounds.map((r) => ({
      queryKey: ringerKeys.roundHoles(r.id),
      queryFn: () => getRoundHoles(r.id),
      staleTime: 1000 * 60 * 30,
      gcTime: 1000 * 60 * 60,
    })),
  });

  const {
    data: teams,
    isLoading: teamsLoading,
    error: teamsError,
    refetch: refetchTeams,
  } = useQuery({
    queryKey: ringerKeys.teams(competitionId ?? ''),
    queryFn: () => getCompetitionTeams(competitionId!),
    enabled: !!competitionId,
    staleTime: 1000 * 60 * 5,
  });

  const isLoading =
    compLoading ||
    teamsLoading ||
    scorecardResults.some((q) => q.isLoading) ||
    holeResults.some((q) => q.isLoading);

  const error =
    (compError as Error | null) ??
    (teamsError as Error | null) ??
    (scorecardResults.find((q) => q.error)?.error as Error | undefined) ??
    (holeResults.find((q) => q.error)?.error as Error | undefined) ??
    null;

  const board = useMemo<RingerBoardResult | null>(() => {
    if (isLoading || error) return null;

    const rounds: RingerRoundInput[] = qualifyingRounds.map((r, idx) => ({
      roundId: r.id,
      roundLabel: roundLabelById[r.id] ?? `R${idx + 1}`,
      holes: holeResults[idx]?.data ?? [],
      scorecards: scorecardResults[idx]?.data ?? [],
    }));

    const players = (compData?.players ?? []).map((cp) => ({
      playerId: cp.player_id,
      name: cp.player?.name ?? 'Unknown',
    }));

    const teamInputs = (teams ?? []).map((t) => ({
      teamId: t.id,
      name: t.name,
      color: t.color,
      memberPlayerIds: (t.members ?? []).map((m) => m.player_id),
    }));

    return computeRingerBoard({ rounds, players, teams: teamInputs });
  }, [
    isLoading,
    error,
    qualifyingRounds,
    roundLabelById,
    holeResults,
    scorecardResults,
    compData,
    teams,
  ]);

  const refetch = () => {
    refetchComp();
    refetchTeams();
    scorecardResults.forEach((q) => q.refetch());
    holeResults.forEach((q) => q.refetch());
  };

  return { board, isLoading, error, refetch };
}
