/**
 * useRoundTeams Hook
 *
 * Fetches team data for team rounds.
 * Only fetches when isTeamRound is true.
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
 */
export function useRoundTeams(
  competitionId: string | undefined,
  isTeamRound: boolean = false
): UseRoundTeamsResult {
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStandaloneRound = competitionId === 'standalone' || !competitionId;

  const fetchTeams = useCallback(async () => {
    // Only fetch teams for team rounds that aren't standalone
    if (!isTeamRound || isStandaloneRound || !competitionId) {
      setTeams([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      roundDataLogger.debug('Fetching teams', {
        competitionId: competitionId.substring(0, 8),
      });

      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(TEAMS_WITH_MEMBERS_SELECT)
        .eq('competition_id', competitionId) as {
          data: SupabaseTeamData[] | null;
          error: { message: string } | null;
        };

      if (teamsError) {
        roundDataLogger.error('Failed to fetch teams', teamsError);
        // Don't fail - just continue without team data
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

      // Transform to TeamWithMembers format
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
  }, [competitionId, isTeamRound, isStandaloneRound]);

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
