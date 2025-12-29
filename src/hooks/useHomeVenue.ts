/**
 * useHomeVenue - Hook for managing user's home venue (golf club)
 *
 * Provides:
 * - Fetch home venue with courses
 * - Set home venue
 * - Clear home venue
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { venueKeys, authKeys } from '@/hooks/queryKeys';
import type { Venue, Course } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

/**
 * Home venue with its courses
 */
export interface HomeVenueWithCourses extends Venue {
  courses: Course[];
}

// =====================================================
// QUERY HOOK
// =====================================================

/**
 * Fetch the user's home venue with courses
 * Returns null if no home venue is set
 */
export function useHomeVenue() {
  const { user, player } = useAuth();

  return useQuery({
    queryKey: venueKeys.homeVenue(user?.id ?? ''),
    queryFn: async (): Promise<HomeVenueWithCourses | null> => {
      if (!player?.home_venue_id) return null;

      const { data, error } = await supabase
        .from('venues')
        .select(`
          *,
          courses (*)
        `)
        .eq('id', player.home_venue_id)
        .single();

      if (error) {
        // If venue not found (deleted), return null gracefully
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data as HomeVenueWithCourses;
    },
    enabled: !!user?.id && !!player?.home_venue_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Set a venue as home
 * Note: Does NOT auto-add to favorites (favorites are course-based)
 */
export function useSetHomeVenue() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (venueId: string) => {
      if (!user) throw new Error('Must be logged in to set home venue');

      // Update player's home_venue_id
      const { error } = await (supabase as any)
        .from('players')
        .update({ home_venue_id: venueId })
        .eq('id', user.id);

      if (error) throw error;
      return venueId;
    },
    onSuccess: () => {
      if (user?.id) {
        // Invalidate all relevant caches
        queryClient.invalidateQueries({ queryKey: venueKeys.homeVenue(user.id) });
        queryClient.invalidateQueries({ queryKey: authKeys.player(user.id) });
        queryClient.invalidateQueries({ queryKey: venueKeys.all });
      }
    },
  });
}

/**
 * Clear the home venue (set to null)
 */
export function useClearHomeVenue() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in to clear home venue');

      const { error } = await (supabase as any)
        .from('players')
        .update({ home_venue_id: null })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: venueKeys.homeVenue(user.id) });
        queryClient.invalidateQueries({ queryKey: authKeys.player(user.id) });
        queryClient.invalidateQueries({ queryKey: venueKeys.all });
      }
    },
  });
}
