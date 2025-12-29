/**
 * usePlaceholderPlayers - Placeholder Players Management Hooks
 *
 * Provides comprehensive placeholder (guest) player functionality:
 * - Fetch user's unlinked placeholder players
 * - Create new placeholder players (name + handicap only)
 * - Link placeholders to real player accounts (transfers all history)
 * - Delete unlinked placeholder players
 *
 * Placeholder players are "guests" added to competitions/rounds without
 * requiring an app account. They can be scored and later linked to real
 * accounts when those people sign up.
 *
 * @example
 * ```tsx
 * function PlaceholderPlayersSection() {
 *   const { data: placeholders, isLoading } = usePlaceholderPlayers();
 *   const createPlaceholder = useCreatePlaceholderPlayer();
 *
 *   const handleCreate = (name: string, handicap?: number) => {
 *     createPlaceholder.mutate({ name, handicap }, {
 *       onSuccess: (player) => {
 *         console.log('Created placeholder:', player.name);
 *       },
 *     });
 *   };
 *
 *   return <PlaceholderList placeholders={placeholders} onCreate={handleCreate} />;
 * }
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { placeholderPlayersKeys, playerKeys, scorecardKeys, competitionKeys } from './queryKeys';
import { useAuth } from './useAuth';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import type {
  Player,
  PlaceholderPlayerInput,
  PlaceholderPlayerWithStats,
  LinkPlaceholderResult,
} from '@/types/database.types';

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Hook: usePlaceholderPlayers
 *
 * Fetches unlinked placeholder players created by the current user.
 * Returns players with usage statistics (competitions/scorecards count).
 *
 * @returns Query result with placeholder players array
 *
 * @example
 * ```tsx
 * const { data: placeholders, isLoading, error, refetch } = usePlaceholderPlayers();
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorState onRetry={refetch} />;
 *
 * return (
 *   <FlatList
 *     data={placeholders}
 *     renderItem={({ item }) => (
 *       <PlaceholderCard
 *         player={item}
 *         competitionsCount={item.competitions_count}
 *         scorecardsCount={item.scorecards_count}
 *       />
 *     )}
 *   />
 * );
 * ```
 */
export function usePlaceholderPlayers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: placeholderPlayersKeys.list(user?.id ?? ''),
    queryFn: async (): Promise<PlaceholderPlayerWithStats[]> => {
      if (!user?.id) return [];

      // Call the RPC function to get placeholder players with stats
      const { data, error } = await supabase.rpc('get_my_placeholder_players');

      if (error) {
        console.error('Error fetching placeholder players:', error);
        throw error;
      }

      return (data || []) as PlaceholderPlayerWithStats[];
    },
    enabled: !!user?.id,
    staleTime: CACHE_TIMES.STANDARD,
    gcTime: GC_TIMES.STANDARD,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

/**
 * Hook: usePlaceholderPlayer
 *
 * Fetches a single placeholder player by ID.
 *
 * @param id - Placeholder player ID
 * @returns Query result with placeholder player data
 */
export function usePlaceholderPlayer(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: placeholderPlayersKeys.detail(id),
    queryFn: async (): Promise<Player | null> => {
      if (!user?.id || !id) return null;

      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', id)
        .eq('is_placeholder', true)
        .eq('created_by', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error fetching placeholder player:', error);
        throw error;
      }

      return data as Player;
    },
    enabled: !!user?.id && !!id,
    staleTime: CACHE_TIMES.STANDARD,
    gcTime: GC_TIMES.STANDARD,
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Hook: useCreatePlaceholderPlayer
 *
 * Creates a new placeholder (guest) player.
 * Placeholder players have auto-generated emails ({uuid}@placeholder.local)
 * and can be added to competitions/rounds without requiring an app account.
 *
 * @returns Mutation for creating placeholder players
 *
 * @example
 * ```tsx
 * const createPlaceholder = useCreatePlaceholderPlayer();
 *
 * const handleAddGuest = () => {
 *   createPlaceholder.mutate(
 *     { name: 'Charlie', handicap: 18 },
 *     {
 *       onSuccess: (player) => {
 *         // Player created successfully
 *         addToSelectedPlayers(player);
 *       },
 *       onError: (error) => {
 *         Alert.alert('Error', error.message);
 *       },
 *     }
 *   );
 * };
 * ```
 */
export function useCreatePlaceholderPlayer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: PlaceholderPlayerInput): Promise<Player> => {
      if (!user?.id) {
        throw new Error('Must be logged in to create placeholder players');
      }

      // Validate input
      if (!input.name || input.name.trim().length < 2) {
        throw new Error('Name must be at least 2 characters');
      }

      if (input.handicap !== undefined && input.handicap !== null) {
        if (input.handicap < 0 || input.handicap > 54) {
          throw new Error('Handicap must be between 0 and 54');
        }
      }

      // Call the RPC function to create the placeholder
      // Note: RPC function types not yet in schema, using explicit types
      const { data, error } = await supabase.rpc(
        'create_placeholder_player' as never,
        {
          p_name: input.name.trim(),
          p_handicap: input.handicap ?? null,
        } as never
      );

      if (error) {
        console.error('Error creating placeholder player:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Failed to create placeholder player');
      }

      // Fetch the full player record
      const { data: player, error: fetchError } = await supabase
        .from('players')
        .select('*')
        .eq('id', data)
        .single();

      if (fetchError) {
        console.error('Error fetching created placeholder:', fetchError);
        throw fetchError;
      }

      return player as Player;
    },
    onSuccess: () => {
      // Invalidate placeholder players list to refresh
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: placeholderPlayersKeys.list(user.id),
        });
      }
    },
  });
}

/**
 * Hook: useLinkPlaceholderPlayer
 *
 * Links a placeholder player to a real player account.
 * This transfers ALL historical data (scorecards, competition memberships,
 * pairings) from the placeholder to the real player.
 *
 * IMPORTANT: This operation cannot be undone. The placeholder remains in the
 * database with linked_player_id set for audit purposes.
 *
 * @returns Mutation for linking placeholder to real player
 *
 * @example
 * ```tsx
 * const linkPlaceholder = useLinkPlaceholderPlayer();
 *
 * const handleLink = (placeholderId: string, realPlayerId: string) => {
 *   linkPlaceholder.mutate(
 *     { placeholderId, realPlayerId },
 *     {
 *       onSuccess: (result) => {
 *         Alert.alert(
 *           'Success',
 *           `Transferred ${result.transferred.scorecards} scorecards ` +
 *           `and ${result.transferred.competitions} competition memberships`
 *         );
 *       },
 *       onError: (error) => {
 *         Alert.alert('Error', error.message);
 *       },
 *     }
 *   );
 * };
 * ```
 */
export function useLinkPlaceholderPlayer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      placeholderId,
      realPlayerId,
    }: {
      placeholderId: string;
      realPlayerId: string;
    }): Promise<LinkPlaceholderResult> => {
      if (!user?.id) {
        throw new Error('Must be logged in to link placeholder players');
      }

      if (!placeholderId || !realPlayerId) {
        throw new Error('Both placeholder ID and real player ID are required');
      }

      // Call the RPC function to link the placeholder
      // Note: RPC function types not yet in schema, using explicit types
      const { data, error } = await supabase.rpc(
        'link_placeholder_player' as never,
        {
          p_placeholder_id: placeholderId,
          p_real_player_id: realPlayerId,
        } as never
      );

      if (error) {
        console.error('Error linking placeholder player:', error);
        throw error;
      }

      return data as LinkPlaceholderResult;
    },
    onSuccess: (result) => {
      // Invalidate multiple queries since data was transferred
      if (user?.id) {
        // Refresh placeholder players list
        queryClient.invalidateQueries({
          queryKey: placeholderPlayersKeys.list(user.id),
        });

        // Refresh the specific placeholder detail
        queryClient.invalidateQueries({
          queryKey: placeholderPlayersKeys.detail(result.placeholder_id),
        });
      }

      // Invalidate player-related queries for the real player
      queryClient.invalidateQueries({
        queryKey: playerKeys.detail(result.real_player_id),
      });

      // Invalidate scorecards since they were transferred
      queryClient.invalidateQueries({
        queryKey: scorecardKeys.all,
      });

      // Invalidate competitions since memberships were transferred
      queryClient.invalidateQueries({
        queryKey: competitionKeys.all,
      });
    },
  });
}

/**
 * Hook: useDeletePlaceholderPlayer
 *
 * Deletes an unlinked placeholder player.
 * Only the user who created the placeholder can delete it.
 * Cannot delete placeholders that have been linked to real accounts.
 *
 * WARNING: This will also delete any scorecards and competition memberships
 * associated with this placeholder (via database cascade).
 *
 * @returns Mutation for deleting placeholder players
 *
 * @example
 * ```tsx
 * const deletePlaceholder = useDeletePlaceholderPlayer();
 *
 * const handleDelete = (placeholderId: string) => {
 *   Alert.alert(
 *     'Delete Guest Player',
 *     'This will permanently delete this guest and all their scores. Continue?',
 *     [
 *       { text: 'Cancel', style: 'cancel' },
 *       {
 *         text: 'Delete',
 *         style: 'destructive',
 *         onPress: () => {
 *           deletePlaceholder.mutate(placeholderId, {
 *             onSuccess: () => {
 *               // Player deleted
 *             },
 *             onError: (error) => {
 *               Alert.alert('Error', error.message);
 *             },
 *           });
 *         },
 *       },
 *     ]
 *   );
 * };
 * ```
 */
export function useDeletePlaceholderPlayer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (placeholderId: string): Promise<void> => {
      if (!user?.id) {
        throw new Error('Must be logged in to delete placeholder players');
      }

      if (!placeholderId) {
        throw new Error('Placeholder ID is required');
      }

      // First verify the placeholder exists and belongs to current user
      const { data: placeholder, error: fetchError } = await supabase
        .from('players')
        .select('id, is_placeholder, created_by, linked_player_id')
        .eq('id', placeholderId)
        .single();

      if (fetchError) {
        console.error('Error fetching placeholder for deletion:', fetchError);
        throw new Error('Placeholder player not found');
      }

      // Type assertion for placeholder fields (schema may not have updated types)
      const placeholderData = placeholder as {
        id: string;
        is_placeholder: boolean;
        created_by: string | null;
        linked_player_id: string | null;
      } | null;

      if (!placeholderData) {
        throw new Error('Placeholder player not found');
      }

      if (!placeholderData.is_placeholder) {
        throw new Error('Cannot delete a real player account');
      }

      if (placeholderData.created_by !== user.id) {
        throw new Error('You can only delete placeholder players you created');
      }

      if (placeholderData.linked_player_id) {
        throw new Error('Cannot delete a placeholder that has been linked to a real account');
      }

      // Delete the placeholder
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', placeholderId)
        .eq('is_placeholder', true)
        .eq('created_by', user.id)
        .is('linked_player_id', null);

      if (deleteError) {
        console.error('Error deleting placeholder player:', deleteError);
        throw deleteError;
      }
    },
    onSuccess: (_, placeholderId) => {
      // Invalidate placeholder players list
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: placeholderPlayersKeys.list(user.id),
        });
      }

      // Remove the specific placeholder from cache
      queryClient.removeQueries({
        queryKey: placeholderPlayersKeys.detail(placeholderId),
      });
    },
  });
}

/**
 * Hook: useUpdatePlaceholderPlayer
 *
 * Updates an unlinked placeholder player's name or handicap.
 * Only the user who created the placeholder can update it.
 *
 * @returns Mutation for updating placeholder players
 *
 * @example
 * ```tsx
 * const updatePlaceholder = useUpdatePlaceholderPlayer();
 *
 * const handleUpdate = (id: string, name: string, handicap: number | null) => {
 *   updatePlaceholder.mutate(
 *     { id, name, handicap },
 *     {
 *       onSuccess: () => {
 *         // Updated successfully
 *       },
 *     }
 *   );
 * };
 * ```
 */
export function useUpdatePlaceholderPlayer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      handicap,
    }: {
      id: string;
      name?: string;
      handicap?: number | null;
    }): Promise<Player> => {
      if (!user?.id) {
        throw new Error('Must be logged in to update placeholder players');
      }

      if (!id) {
        throw new Error('Placeholder ID is required');
      }

      // Build update object
      const updates: Partial<Player> = {};

      if (name !== undefined) {
        if (name.trim().length < 2) {
          throw new Error('Name must be at least 2 characters');
        }
        updates.name = name.trim();
      }

      if (handicap !== undefined) {
        if (handicap !== null && (handicap < 0 || handicap > 54)) {
          throw new Error('Handicap must be between 0 and 54');
        }
        updates.handicap = handicap;
      }

      if (Object.keys(updates).length === 0) {
        throw new Error('No updates provided');
      }

      // Update the placeholder
      const { data, error } = await supabase
        .from('players')
        .update(updates as never)
        .eq('id', id)
        .eq('is_placeholder', true)
        .eq('created_by', user.id)
        .is('linked_player_id', null)
        .select()
        .single();

      if (error) {
        console.error('Error updating placeholder player:', error);
        throw error;
      }

      return data as Player;
    },
    onSuccess: (player) => {
      // Invalidate placeholder players list
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: placeholderPlayersKeys.list(user.id),
        });
      }

      // Update the specific placeholder in cache
      queryClient.setQueryData(placeholderPlayersKeys.detail(player.id), player);
    },
  });
}
