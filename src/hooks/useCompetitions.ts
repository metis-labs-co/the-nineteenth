import { useQuery } from '@tanstack/react-query';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { apiClient } from '@/services/api/client';
import { competitionKeys } from '@/hooks/queryKeys';
import type { Competition } from '@/types';

/**
 * Query hook to fetch all competitions for the current user
 *
 * Returns competitions where the user is either:
 * - The organizer (created the competition)
 * - A player (was invited and accepted)
 *
 * Usage:
 * ```tsx
 * function CompetitionsScreen() {
 *   const { data, isLoading, error, refetch } = useCompetitions();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorState message={error.message} onRetry={refetch} />;
 *   if (!data?.length) return <EmptyState message="No competitions yet" />;
 *
 *   return (
 *     <FlatList
 *       data={data}
 *       renderItem={({ item }) => <CompetitionCard competition={item} />}
 *       refreshing={isLoading}
 *       onRefresh={refetch}
 *     />
 *   );
 * }
 * ```
 */
export function useCompetitions() {
  return useQuery({
    queryKey: competitionKeys.lists(),
    queryFn: async (): Promise<Competition[]> => {
      // TODO: Replace with actual API call when backend is ready
      // The backend should filter competitions by:
      // 1. User is organizer (competitions.organizer_id = current_user_id)
      // 2. User is player (competition_players.player_id = current_user_id AND status = 'accepted')
      //
      // Example Supabase query:
      // const { data: organized } = await supabase
      //   .from('competitions')
      //   .select('*')
      //   .eq('organizer_id', userId);
      //
      // const { data: participating } = await supabase
      //   .from('competition_players')
      //   .select('competition:competitions(*)')
      //   .eq('player_id', userId)
      //   .eq('status', 'accepted');

      const competitions = await apiClient.getCompetitions();
      return competitions;
    },

    // Cache configuration
    staleTime: CACHE_TIMES.STANDARD, // Consider data fresh for 5 minutes
    gcTime: GC_TIMES.STANDARD, // Keep in cache for 10 minutes (formerly cacheTime)

    // Retry configuration
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

    // Refetch behavior
    refetchOnWindowFocus: false, // Don't refetch when app comes to foreground
    refetchOnReconnect: true, // Refetch when network reconnects
    refetchOnMount: true, // Refetch when component mounts if data is stale
  });
}

/**
 * Hook variant with filters for organizing vs participating competitions
 *
 * Usage:
 * ```tsx
 * // Get only competitions user organized
 * const { data: myCompetitions } = useCompetitions({ role: 'organizer' });
 *
 * // Get only competitions user is playing in
 * const { data: participating } = useCompetitions({ role: 'player' });
 * ```
 */
export interface CompetitionsFilter {
  role?: 'organizer' | 'player' | 'all';
  status?: 'upcoming' | 'active' | 'completed';
}

export function useFilteredCompetitions(filters?: CompetitionsFilter) {
  return useQuery({
    queryKey: competitionKeys.list(filters),
    queryFn: async (): Promise<Competition[]> => {
      // TODO: Implement filtered API call when backend is ready
      // Pass filters to backend for server-side filtering
      //
      // Example:
      // const response = await apiClient.get<Competition[]>('/competitions', {
      //   params: filters
      // });
      // return response.data;

      const competitions = await apiClient.getCompetitions();

      // Client-side filtering (temporary until backend supports it)
      // Note: This is inefficient - move to server-side when backend is ready
      if (!filters) return competitions;

      return competitions.filter((comp) => {
        // Filter by status if provided
        if (filters.status) {
          const now = new Date();
          const startDate = new Date(comp.startDate);
          const endDate = comp.endDate ? new Date(comp.endDate) : startDate;

          switch (filters.status) {
            case 'upcoming':
              if (startDate <= now) return false;
              break;
            case 'active':
              if (startDate > now || endDate < now) return false;
              break;
            case 'completed':
              if (endDate >= now) return false;
              break;
          }
        }

        // Role filtering would require user context
        // TODO: Implement when auth context is available

        return true;
      });
    },

    // Same cache configuration as base hook
    staleTime: CACHE_TIMES.STANDARD,
    gcTime: GC_TIMES.STANDARD,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
