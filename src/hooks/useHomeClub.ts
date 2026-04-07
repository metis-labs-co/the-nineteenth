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
import { CACHE_TIMES } from '@/constants/cacheConfig';
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

// =====================================================
// QUERY HOOK
// =====================================================

/**
 * Fetch the user's home club with courses
 * Returns null if no home club is set
 */
export function useHomeClub() {
  const { user, player } = useAuth();
  const homeClubId = player?.home_club_id;

  return useQuery({
    // Include homeClubId in key so the query refetches when the player's home club changes
    queryKey: [...clubKeys.homeClub(user?.id ?? ''), homeClubId],
    queryFn: async (): Promise<HomeClubWithCourses | null> => {
      if (!homeClubId) return null;

      const { data, error } = await supabase
        .from('clubs')
        .select(`
          *,
          courses (*)
        `)
        .eq('id', homeClubId)
        .single();

      if (error) {
        // If club not found (deleted), return null gracefully
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data as HomeClubWithCourses;
    },
    enabled: !!user?.id && !!homeClubId,
    staleTime: CACHE_TIMES.STANDARD,
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

