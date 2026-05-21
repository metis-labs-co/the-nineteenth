/**
 * TanStack Query hooks for Teams
 *
 * Provides hooks for fetching and mutating team data in competitions.
 *
 * Hooks:
 * - useTeams(competitionId) - Fetch all teams for a competition
 * - useCreateTeam() - Create a new team
 * - useUpdateTeam() - Update team members
 * - useUpdateTeamMetadata() - Update team name and/or colour
 * - useDeleteTeam() - Delete a team
 * - useAutoGenerateTeams() - Auto-generate balanced teams
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamKeys } from '@/hooks/queryKeys';
import {
  getCompetitionTeams,
  createTeam,
  updateTeamMembers,
  updateTeamMetadata,
  clearTeamMembers,
  deleteTeam,
  autoGenerateTeams,
} from '@/services/teams';
import type { CreateTeamInput } from '@/services/teams';
import type { TeamWithMembers, Team } from '@/types/database.types';

// =====================================================
// QUERY HOOK
// =====================================================

/**
 * Query hook to fetch all teams for a competition
 *
 * Returns teams with full member and player data populated.
 *
 * @param competitionId - Competition UUID
 * @returns Query result with teams array
 *
 * @example
 * ```tsx
 * function TeamsScreen({ competitionId }: { competitionId: string }) {
 *   const { data: teams, isLoading, error, refetch } = useTeams(competitionId);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorState message={error.message} onRetry={refetch} />;
 *   if (!teams?.length) return <EmptyState message="No teams yet" />;
 *
 *   return (
 *     <FlatList
 *       data={teams}
 *       renderItem={({ item }) => <TeamCard team={item} />}
 *       refreshing={isLoading}
 *       onRefresh={refetch}
 *     />
 *   );
 * }
 * ```
 */
export function useTeams(competitionId: string) {
  return useQuery({
    queryKey: teamKeys.list(competitionId),
    queryFn: async (): Promise<TeamWithMembers[]> => {
      return getCompetitionTeams(competitionId);
    },

    // Only fetch if competitionId is provided
    enabled: !!competitionId,

    // Cache configuration
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes

    // Retry configuration
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

    // Refetch behavior
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Mutation hook to create a new team
 *
 * Invalidates the teams list for the competition on success.
 *
 * @returns Mutation result with createTeam function
 *
 * @example
 * ```tsx
 * function CreateTeamButton({ competitionId }: { competitionId: string }) {
 *   const { mutate: createTeam, isPending } = useCreateTeam();
 *
 *   const handleCreate = () => {
 *     createTeam(
 *       {
 *         competitionId,
 *         name: 'Team Alpha',
 *         memberIds: ['player-1', 'player-2'],
 *       },
 *       {
 *         onSuccess: (team) => {
 *           Alert.alert('Success', `Created ${team.name}`);
 *         },
 *         onError: (error) => {
 *           Alert.alert('Error', error.message);
 *         },
 *       }
 *     );
 *   };
 *
 *   return (
 *     <Button onPress={handleCreate} loading={isPending}>
 *       Create Team
 *     </Button>
 *   );
 * }
 * ```
 */
export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTeamInput): Promise<TeamWithMembers> => {
      return createTeam(input);
    },

    onSuccess: (data, variables) => {
      // Invalidate the teams list for this competition
      queryClient.invalidateQueries({
        queryKey: teamKeys.list(variables.competitionId),
      });
    },

    onError: (error) => {
      console.error('[useCreateTeam] Failed to create team:', error);
    },
  });
}

/**
 * Mutation hook to update team members
 *
 * Replaces all team members with the provided list.
 * Invalidates both the specific team and the teams list.
 *
 * @returns Mutation result with updateTeam function
 *
 * @example
 * ```tsx
 * function EditTeamMembers({ team }: { team: TeamWithMembers }) {
 *   const { mutate: updateTeam, isPending } = useUpdateTeam();
 *   const [selectedMembers, setSelectedMembers] = useState(
 *     team.members.map(m => m.player_id)
 *   );
 *
 *   const handleSave = () => {
 *     updateTeam(
 *       {
 *         teamId: team.id,
 *         competitionId: team.competition_id,
 *         memberIds: selectedMembers,
 *       },
 *       {
 *         onSuccess: () => {
 *           Alert.alert('Success', 'Team updated');
 *         },
 *       }
 *     );
 *   };
 *
 *   return <Button onPress={handleSave} loading={isPending}>Save</Button>;
 * }
 * ```
 */
export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      memberIds,
    }: {
      teamId: string;
      competitionId: string;
      memberIds: string[];
    }): Promise<TeamWithMembers> => {
      return updateTeamMembers(teamId, memberIds);
    },

    onSuccess: (data, variables) => {
      // Invalidate the teams list for this competition
      queryClient.invalidateQueries({
        queryKey: teamKeys.list(variables.competitionId),
      });
      // Invalidate the specific team detail if cached
      queryClient.invalidateQueries({
        queryKey: teamKeys.detail(variables.teamId),
      });
    },

    onError: (error) => {
      console.error('[useUpdateTeam] Failed to update team:', error);
    },
  });
}

/**
 * Mutation hook to clear all members from one or more teams.
 *
 * Empties the given teams without deleting the team rows, so organizers can
 * wipe every assignment and reassign players manually. Invalidates the teams
 * list for the competition on success.
 *
 * @example
 * ```tsx
 * const { mutate: clearTeams, isPending } = useClearTeamMembers();
 * clearTeams({ competitionId, teamIds: teams.map((t) => t.id) });
 * ```
 */
export function useClearTeamMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamIds,
    }: {
      competitionId: string;
      teamIds: string[];
    }): Promise<void> => {
      return clearTeamMembers(teamIds);
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: teamKeys.list(variables.competitionId),
      });
    },

    onError: (error) => {
      console.error('[useClearTeamMembers] Failed to clear teams:', error);
    },
  });
}

/**
 * Mutation hook to update a team's name and/or colour.
 *
 * Either field can be provided independently. Invalidates the teams
 * list for the competition on success.
 *
 * @returns Mutation result with updateTeamMetadata function
 *
 * @example
 * ```tsx
 * function EditTeam({ team }: { team: TeamWithMembers }) {
 *   const { mutate, isPending } = useUpdateTeamMetadata();
 *
 *   const handleSave = (name: string, color: string) => {
 *     mutate({
 *       teamId: team.id,
 *       competitionId: team.competition_id,
 *       name,
 *       color,
 *     });
 *   };
 *
 *   return <TextInput onSubmitEditing={(e) => handleSave(e.nativeEvent.text, 'avatar-green')} />;
 * }
 * ```
 */
export function useUpdateTeamMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      name,
      color,
    }: {
      teamId: string;
      competitionId: string;
      name?: string;
      color?: string | null;
    }): Promise<Team> => {
      return updateTeamMetadata(teamId, { name, color });
    },

    onSuccess: (data, variables) => {
      // Invalidate the teams list for this competition
      queryClient.invalidateQueries({
        queryKey: teamKeys.list(variables.competitionId),
      });
      // Invalidate the specific team detail if cached
      queryClient.invalidateQueries({
        queryKey: teamKeys.detail(variables.teamId),
      });
    },

    onError: (error) => {
      console.error('[useUpdateTeamMetadata] Failed to update team:', error);
    },
  });
}

/**
 * Mutation hook to delete a team
 *
 * Removes the team from cache and invalidates the teams list.
 *
 * @returns Mutation result with deleteTeam function
 *
 * @example
 * ```tsx
 * function DeleteTeamButton({ team }: { team: TeamWithMembers }) {
 *   const { mutate: deleteTeam, isPending } = useDeleteTeam();
 *
 *   const handleDelete = () => {
 *     Alert.alert(
 *       'Delete Team',
 *       `Are you sure you want to delete ${team.name}?`,
 *       [
 *         { text: 'Cancel', style: 'cancel' },
 *         {
 *           text: 'Delete',
 *           style: 'destructive',
 *           onPress: () => {
 *             deleteTeam(
 *               { teamId: team.id, competitionId: team.competition_id },
 *               {
 *                 onSuccess: () => {
 *                   Alert.alert('Deleted', 'Team has been removed');
 *                 },
 *               }
 *             );
 *           },
 *         },
 *       ]
 *     );
 *   };
 *
 *   return (
 *     <Button onPress={handleDelete} loading={isPending} variant="danger">
 *       Delete Team
 *     </Button>
 *   );
 * }
 * ```
 */
export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
    }: {
      teamId: string;
      competitionId: string;
    }): Promise<void> => {
      return deleteTeam(teamId);
    },

    onSuccess: (_, variables) => {
      // Remove the specific team from cache
      queryClient.removeQueries({
        queryKey: teamKeys.detail(variables.teamId),
      });
      // Invalidate the teams list for this competition
      queryClient.invalidateQueries({
        queryKey: teamKeys.list(variables.competitionId),
      });
    },

    onError: (error) => {
      console.error('[useDeleteTeam] Failed to delete team:', error);
    },
  });
}

/**
 * Mutation hook to auto-generate balanced teams.
 *
 * Runs snake draft + pairwise-swap optimisation against accepted players,
 * then persists the result.
 *
 * Pass `preserveNames: true` to keep existing team rows (ids + names) and
 * only replace memberships when the existing count matches `numTeams`.
 * Otherwise the existing teams are wiped and recreated as "Team 1..N".
 *
 * @example
 * ```tsx
 * const { mutate: generateTeams, isPending } = useAutoGenerateTeams();
 *
 * // Non-destructive reshuffle (names preserved)
 * generateTeams({ competitionId, numTeams: 5, preserveNames: true });
 *
 * // Destructive rebuild (count changed, confirm first)
 * generateTeams({ competitionId, numTeams: 6 });
 * ```
 */
export function useAutoGenerateTeams() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      competitionId,
      numTeams,
      preserveNames,
    }: {
      competitionId: string;
      numTeams: number;
      preserveNames?: boolean;
    }): Promise<TeamWithMembers[]> => {
      return autoGenerateTeams({ competitionId, numTeams, preserveNames });
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: teamKeys.list(variables.competitionId),
      });
    },

    onError: (error) => {
      console.error('[useAutoGenerateTeams] Failed to generate teams:', error);
    },
  });
}
