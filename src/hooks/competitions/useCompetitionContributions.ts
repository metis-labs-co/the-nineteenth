// src/hooks/competitions/useCompetitionContributions.ts
import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useCompetitionDetailsData } from './queries';
import { getRoundHoles } from '@/services/courses/getRoundHoles';
import { fetchFinishedScorecardsForRound } from '@/services/scorecards/fetchFinishedScorecardsForRound';
import { getCompetitionTeams } from '@/services/teams/teamQueries';
import { contributionKeys } from '@/hooks/queryKeys';
import { computeContributions } from '@/utils/contributions';
import { isSingleBallScore } from '@/types/database/base';
import { listSubMatchesForRound } from '@/services/subMatches';
import type {
  ComputeContributionsInput,
  ContributionFormat,
  ContributionRoundInput,
  ContributionsBoard,
  ContributionTeamInput,
  HoleShotSlots,
  AltShotPairInput,
} from '@/utils/contributions';
import type { Scorecard as DBScorecard } from '@/types/database/scorecard.types';
import type { TeamWithMembers } from '@/types/database/team.types';
import type { GameType, TeamFormat } from '@/types/database/enums';
import type { SubMatch } from '@/types/database/round.types';

interface UseCompetitionContributionsResult {
  board: ContributionsBoard | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/** Resolve a round's contribution format, or null if it's not a team format. */
function contributionFormat(round: {
  team_format?: TeamFormat | null;
  game_type: GameType;
}): ContributionFormat | null {
  const tf = round.team_format ?? undefined;
  const gt = round.game_type;
  if (tf === 'best-ball' || gt === 'best-ball') return 'best-ball';
  if (tf === 'scramble' || gt === 'scramble') return 'scramble';
  // Alt-shot derives contributions per 2-player pair (see buildAltShotPairs).
  if (tf === 'alt-shot' || gt === 'alt-shot') return 'alt-shot';
  if (tf === 'shamble' || gt === 'shamble') return 'shamble';
  if (tf === 'aggregate') return 'aggregate';
  return null;
}

/** Build a team input from a competition team + this round's scorecards. */
function buildTeamInput(
  team: TeamWithMembers,
  scorecards: DBScorecard[]
): ContributionTeamInput {
  const memberIds = new Set((team.members ?? []).map((m) => m.player_id));
  const teamCards = scorecards.filter((sc) => memberIds.has(sc.player_id));

  const strokesByPlayerHole: Record<string, Record<number, number | undefined>> = {};
  const shotContributionsByHole: Record<number, HoleShotSlots> = {};

  for (const card of teamCards) {
    const scores = card.scores ?? {};
    const perHole: Record<number, number | undefined> = {};

    for (const [holeStr, hs] of Object.entries(scores)) {
      const holeNum = Number(holeStr);
      if (isSingleBallScore(hs)) {
        perHole[holeNum] = hs.strokes;
        if (hs.shotContributions) {
          // HoleShotContributions and HoleShotSlots share the same shape
          shotContributionsByHole[holeNum] = hs.shotContributions as HoleShotSlots;
        }
      }
      // MultiBallHoleScore entries are skipped — team formats use single-ball cards
    }

    strokesByPlayerHole[card.player_id] = perHole;
  }

  return {
    teamId: team.id,
    teamName: team.name,
    color: team.color ?? null,
    members: (team.members ?? []).map((m) => ({
      playerId: m.player_id,
      playerName: m.player?.name ?? 'Unknown',
      handicap: m.player?.handicap ?? 0,
    })),
    strokesByPlayerHole,
    shotContributionsByHole,
  };
}

/** Build alt-shot pair inputs for a round from its sub-matches + scorecards.
 *  Each sub-match side (team_a_player_ids / team_b_player_ids) is one pair that
 *  shares a ball; both members hold identical ball scores, so read from the
 *  first member whose card has scores. */
function buildAltShotPairs(
  subMatches: SubMatch[],
  scorecards: DBScorecard[]
): AltShotPairInput[] {
  const cardByPlayer = new Map(scorecards.map((c) => [c.player_id, c]));
  const pairs: AltShotPairInput[] = [];

  for (const sm of subMatches) {
    for (const side of [sm.team_a_player_ids, sm.team_b_player_ids]) {
      if (!side || side.length < 2) continue;

      const ballCard = side
        .map((id) => cardByPlayer.get(id))
        .find((c) => c && c.scores && Object.keys(c.scores).length > 0);

      const strokesByHole: Record<number, number | undefined> = {};
      let firstTee: string | undefined;

      if (ballCard) {
        for (const [holeStr, hs] of Object.entries(ballCard.scores ?? {})) {
          if (!isSingleBallScore(hs)) continue;
          const holeNum = Number(holeStr);
          strokesByHole[holeNum] = hs.strokes;
          if (holeNum === 1 && hs.shotContributions?.teeShot) {
            firstTee = hs.shotContributions.teeShot;
          }
        }
      }

      pairs.push({
        playerIds: side,
        firstTeePlayerId: firstTee ?? side[0],
        strokesByHole,
      });
    }
  }

  return pairs;
}

export function useCompetitionContributions(
  competitionId: string | undefined
): UseCompetitionContributionsResult {
  const {
    data: compData,
    isLoading: compLoading,
    error: compError,
    refetch: refetchComp,
  } = useCompetitionDetailsData(competitionId);

  // Stable labels: number every round by position in the full rounds list,
  // so labels (R1..R4) match what users see even though non-team rounds are excluded.
  const teamRounds = useMemo(() => {
    return (compData?.rounds ?? [])
      .map((r, idx) => ({ round: r, format: contributionFormat(r), label: `R${idx + 1}` }))
      .filter(
        (x): x is { round: (typeof x)['round']; format: ContributionFormat; label: string } =>
          x.format !== null
      );
  }, [compData]);

  const scorecardResults = useQueries({
    queries: teamRounds.map(({ round }) => ({
      queryKey: contributionKeys.scorecards(round.id),
      queryFn: () => fetchFinishedScorecardsForRound(round.id),
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
    })),
  });

  const holeResults = useQueries({
    queries: teamRounds.map(({ round }) => ({
      queryKey: contributionKeys.roundHoles(round.id),
      queryFn: () => getRoundHoles(round.id),
      staleTime: 1000 * 60 * 30,
      gcTime: 1000 * 60 * 60,
    })),
  });

  const subMatchResults = useQueries({
    queries: teamRounds.map(({ round, format }) => ({
      queryKey: contributionKeys.subMatches(round.id),
      queryFn: () => listSubMatchesForRound(round.id),
      enabled: format === 'alt-shot',
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
    })),
  });

  const {
    data: teams,
    isLoading: teamsLoading,
    error: teamsError,
    refetch: refetchTeams,
  } = useQuery({
    queryKey: contributionKeys.teams(competitionId ?? ''),
    queryFn: () => getCompetitionTeams(competitionId!),
    enabled: !!competitionId,
    staleTime: 1000 * 60 * 5,
  });

  const isLoading =
    compLoading ||
    teamsLoading ||
    scorecardResults.some((q) => q.isLoading) ||
    holeResults.some((q) => q.isLoading) ||
    subMatchResults.some((q) => q.isLoading);

  const error =
    (compError as Error | null) ??
    (teamsError as Error | null) ??
    (scorecardResults.find((q) => q.error)?.error as Error | undefined) ??
    (holeResults.find((q) => q.error)?.error as Error | undefined) ??
    (subMatchResults.find((q) => q.error)?.error as Error | undefined) ??
    null;

  const board = useMemo<ContributionsBoard | null>(() => {
    if (isLoading || error) return null;

    const allTeams = teams ?? [];

    const rounds: ContributionRoundInput[] = teamRounds.map(({ round, format, label }, idx) => {
      const cards = scorecardResults[idx]?.data ?? [];
      const teamInputs = allTeams
        .map((t) => buildTeamInput(t, cards))
        .filter(
          (t) =>
            Object.keys(t.strokesByPlayerHole).length > 0 ||
            Object.keys(t.shotContributionsByHole ?? {}).length > 0
        );
      const isAltShot = format === 'alt-shot';
      const altShotPairs = isAltShot
        ? buildAltShotPairs(subMatchResults[idx]?.data ?? [], cards)
        : undefined;
      return {
        roundId: round.id,
        roundLabel: label,
        format,
        gameType: round.game_type,
        holes: holeResults[idx]?.data ?? [],
        teams: teamInputs,
        altShotPairs,
      };
    });

    const input: ComputeContributionsInput = { rounds };
    return computeContributions(input);
  }, [isLoading, error, teamRounds, scorecardResults, holeResults, teams, subMatchResults]);

  const refetch = () => {
    refetchComp();
    refetchTeams();
    scorecardResults.forEach((q) => q.refetch());
    holeResults.forEach((q) => q.refetch());
    subMatchResults.forEach((q) => q.refetch());
  };

  return { board, isLoading, error, refetch };
}
