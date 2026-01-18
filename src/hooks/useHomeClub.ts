/**
 * useHomeClub - Hook for managing user's home club (golf club)
 *
 * Provides:
 * - Fetch home club with courses
 * - Set home club
 * - Clear home club
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { clubKeys, authKeys } from '@/hooks/queryKeys';
import type { Club, Course } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

/**
 * Home club with its courses
 */
export interface HomeClubWithCourses extends Club {
  courses: Course[];
}

/**
 * @deprecated Use HomeClubWithCourses instead
 */
export type HomeVenueWithCourses = HomeClubWithCourses;

// =====================================================
// QUERY HOOK
// =====================================================

/**
 * Fetch the user's home club with courses
 * Returns null if no home club is set
 */
export function useHomeClub() {
  const { user, player } = useAuth();

  return useQuery({
    queryKey: clubKeys.homeClub(user?.id ?? ''),
    queryFn: async (): Promise<HomeClubWithCourses | null> => {
      if (!player?.home_club_id) return null;

      const { data, error } = await supabase
        .from('clubs')
        .select(`
          *,
          courses (*)
        `)
        .eq('id', player.home_club_id)
        .single();

      if (error) {
        // If club not found (deleted), return null gracefully
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data as HomeClubWithCourses;
    },
    enabled: !!user?.id && !!player?.home_club_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Set a club as home
 * Note: Does NOT auto-add to favorites (favorites are course-based)
 */
export function useSetHomeClub() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clubId: string) => {
      if (!user) throw new Error('Must be logged in to set home club');

      // Update player's home_club_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { error } = await (supabase as any)
        .from('players')
        .update({ home_club_id: clubId })
        .eq('id', user.id);

      if (error) throw error;
      return clubId;
    },
    onSuccess: () => {
      if (user?.id) {
        // Invalidate all relevant caches
        queryClient.invalidateQueries({ queryKey: clubKeys.homeClub(user.id) });
        queryClient.invalidateQueries({ queryKey: authKeys.player(user.id) });
        queryClient.invalidateQueries({ queryKey: clubKeys.all });
      }
    },
  });
}

/**
 * Clear the home club (set to null)
 */
export function useClearHomeClub() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in to clear home club');

      // Type assertion needed because Supabase generated types may not include all Player fields
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
      const { error } = await (supabase as any)
        .from('players')
        .update({ home_club_id: null })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: clubKeys.homeClub(user.id) });
        queryClient.invalidateQueries({ queryKey: authKeys.player(user.id) });
        queryClient.invalidateQueries({ queryKey: clubKeys.all });
      }
    },
  });
}

// =====================================================
// DEPRECATED HOOKS (for backward compatibility)
// =====================================================

/**
 * @deprecated Use useHomeClub instead
 */
export const useHomeVenue = useHomeClub;

/**
 * @deprecated Use useSetHomeClub instead
 */
export const useSetHomeVenue = useSetHomeClub;

/**
 * @deprecated Use useClearHomeClub instead
 */
export const useClearHomeVenue = useClearHomeClub;
