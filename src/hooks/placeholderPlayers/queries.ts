/**
 * Placeholder Players - Query Hooks
 *
 * TanStack Query hooks for fetching placeholder (guest) player data.
 *
 * Hooks:
 * - usePlaceholderPlayers() - Fetch user's unlinked placeholder players with stats
 * - usePlaceholderPlayer(id) - Fetch a single placeholder player by ID
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { placeholderPlayersKeys } from '@/hooks/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import type {
  Player,
  PlaceholderPlayerWithStats,
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
