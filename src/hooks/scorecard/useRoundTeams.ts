/**
 * useRoundTeams Hook
 *
 * Fetches team data for team rounds.
 * - Competition rounds: teams come from the `teams` table (keyed by competition_id).
 * - Standalone rounds: teams are built from `rounds.team_config` JSONB, with
 *   player details hydrated from the `players` table by memberId.
 */

import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/services/supabase/client';
import { roundDataLogger } from '@/utils/debugLogger';
import type { TeamWithMembers } from '@/types/database.types';
import {
  TEAMS_WITH_MEMBERS_SELECT,
  createDBPlayer,
  type SupabaseTeamData,
  type SupabaseTeamMemberData,
  type SupabasePlayerData,
  type StandaloneTeamConfig,
} from '@/types/supabase/roundQueries';

interface UseRoundTeamsResult {
  teams: TeamWithMembers[];
  getPlayerTeam: (playerId: string) => TeamWithMembers | undefined;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching team data for team rounds
 *
 * @param competitionId Competition ID (undefined / "standalone" for standalone rounds)
 * @param isTeamRound Whether this is a team-format round
 * @param roundId Round ID — required to load `team_config` for standalone rounds
 */
export function useRoundTeams(
  competitionId: string | undefined,
  isTeamRound: boolean = false,
  roundId?: string
): UseRoundTeamsResult {
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStandaloneRound = competitionId === 'standalone' || !competitionId;

  const fetchTeams = useCallback(async () => {
    if (!isTeamRound) {
      setTeams([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Standalone rounds: build teams from rounds.team_config
      if (isStandaloneRound) {
        if (!roundId) {
          setTeams([]);
          setIsLoading(false);
          return;
        }

        const { data: roundRow, error: roundErr } = await supabase
          .from('rounds')
          .select('team_config')
          .eq('id', roundId)
          .single() as {
            data: { team_config: StandaloneTeamConfig | null } | null;
            error: { message: string } | null;
          };

        if (roundErr) {
          roundDataLogger.error('Failed to fetch round team_config', roundErr);
          setTeams([]);
          setIsLoading(false);
          return;
        }

        const teamConfig = roundRow?.team_config;
        if (!teamConfig?.teams || teamConfig.teams.length === 0) {
          roundDataLogger.debug('No team_config on standalone round');
          setTeams([]);
          setIsLoading(false);
          return;
        }

        const allMemberIds = Array.from(
          new Set(teamConfig.teams.flatMap((t) => t.memberIds))
        );

        const { data: playersData, error: playersErr } = await supabase
          .from('players')
          .select('id, name, email, phone, handicap, handicap_index, gender, photo_url')
          .in('id', allMemberIds) as {
            data: SupabasePlayerData[] | null;
            error: { message: string } | null;
          };

        if (playersErr) {
          roundDataLogger.error('Failed to fetch team members', playersErr);
        }

        const playerMap = new Map(
          (playersData ?? []).map((p) => [p.id, p])
        );

        const transformedTeams: TeamWithMembers[] = teamConfig.teams.map((t) => ({
          id: t.id,
          competition_id: '',
          name: t.name,
          created_at: '',
          updated_at: '',
          members: t.memberIds.map((memberId) => {
            const player = playerMap.get(memberId);
            return {
              team_id: t.id,
              player_id: memberId,
              joined_at: '',
              player: player ? createDBPlayer(player) : undefined,
            };
          }),
        }));

        roundDataLogger.info('Loaded standalone teams from team_config', {
          teamCount: transformedTeams.length,
        });

        setTeams(transformedTeams);
        setIsLoading(false);
        return;
      }

      // Competition rounds: fetch from teams table
      roundDataLogger.debug('Fetching teams', {
        competitionId: competitionId!.substring(0, 8),
      });

      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(TEAMS_WITH_MEMBERS_SELECT)
        .eq('competition_id', competitionId!) as {
          data: SupabaseTeamData[] | null;
          error: { message: string } | null;
        };

      if (teamsError) {
        roundDataLogger.error('Failed to fetch teams', teamsError);
        setTeams([]);
        setIsLoading(false);
        return;
      }

      if (!teamsData || teamsData.length === 0) {
        roundDataLogger.debug('No teams found');
        setTeams([]);
        setIsLoading(false);
        return;
      }

      const transformedTeams: TeamWithMembers[] = teamsData.map((team) => ({
        id: team.id,
        competition_id: team.competition_id,
        name: team.name,
        created_at: team.created_at,
        updated_at: team.updated_at,
        members: (team.team_members || []).map((tm: SupabaseTeamMemberData) => ({
          team_id: tm.team_id,
          player_id: tm.player_id,
          joined_at: tm.joined_at,
          player: tm.players ? createDBPlayer(tm.players) : undefined,
        })),
      }));

      roundDataLogger.info('Loaded teams', {
        teamCount: transformedTeams.length,
        teams: transformedTeams.map((t) => ({
          name: t.name,
          memberCount: t.members?.length || 0,
        })),
      });

      setTeams(transformedTeams);
      setIsLoading(false);
    } catch (err) {
      roundDataLogger.error('Error fetching teams', err);
      setError(err instanceof Error ? err.message : 'Failed to load teams');
      setTeams([]);
      setIsLoading(false);
    }
  }, [competitionId, isTeamRound, isStandaloneRound, roundId]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const getPlayerTeam = useCallback(
    (playerId: string): TeamWithMembers | undefined => {
      return teams.find((team) =>
        team.members?.some((member) => member.player_id === playerId)
      );
    },
    [teams]
  );

  return {
    teams,
    getPlayerTeam,
    isLoading,
    error,
    refetch: fetchTeams,
  };
}
