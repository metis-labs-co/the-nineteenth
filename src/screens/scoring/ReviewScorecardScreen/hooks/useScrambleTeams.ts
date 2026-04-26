/**
 * useScrambleTeams - Resolves scramble team roster for the Review Scorecard.
 *
 * Competition rounds store teams in the `teams` table; standalone rounds store
 * them in `rounds.team_config`. `useRoundTeams` already branches correctly, so
 * this hook reuses it and normalises the output into the `{ id, name, memberIds }[]`
 * shape the scramble tab components expect.
 */

import { useMemo } from 'react';
import { useRoundTeams } from '@/hooks/scorecard/useRoundTeams';
import type { Player } from '@/types';
import type { RoundWithCourse } from '@/hooks/useRoundDetails';
import type { StandaloneTeamConfig } from '@/types/supabase/roundQueries';

export interface ScrambleTeam {
  id: string;
  name: string;
  memberIds: string[];
}

interface UseScrambleTeamsParams {
  isScramble: boolean;
  roundId: string | undefined;
  roundDetails: RoundWithCourse | undefined;
  currentPlayers: Player[];
}

export function useScrambleTeams({
  isScramble,
  roundId,
  roundDetails,
  currentPlayers,
}: UseScrambleTeamsParams): ScrambleTeam[] {
  const competitionId = roundDetails?.competition_id ?? undefined;

  const { teams: fetchedTeams, isLoading } = useRoundTeams(
    competitionId,
    isScramble,
    roundId
  );

  return useMemo<ScrambleTeam[]>(() => {
    if (!isScramble) return [];

    if (fetchedTeams.length > 0) {
      return fetchedTeams.map((t) => ({
        id: t.id,
        name: t.name,
        memberIds: (t.members ?? []).map((m) => m.player_id),
      }));
    }

    const teamConfig = (roundDetails as unknown as { team_config?: StandaloneTeamConfig })?.team_config;
    if (teamConfig?.teams?.length) return teamConfig.teams;

    // Still fetching — avoid flashing the single-team fallback over the real roster.
    if (isLoading) return [];

    const allPlayerIds = currentPlayers.map((p) => p.id);
    if (allPlayerIds.length > 0) {
      return [{ id: 'default-team', name: 'Team', memberIds: allPlayerIds }];
    }
    return [];
  }, [isScramble, fetchedTeams, isLoading, roundDetails, currentPlayers]);
}
