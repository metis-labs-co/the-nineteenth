/**
 * Custom hole tees — query + mutation hooks.
 *
 * Persists user-defined tee positions for a course/hole separately from
 * GolfAPI's `hole_coordinates`, so refreshing course data doesn't wipe
 * them out.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { customHoleTeeKeys } from '@/hooks/queryKeys/customTees';
import { bagKeys } from '@/hooks/queryKeys';
import type {
  CustomHoleTee,
  CustomHoleTeeInsert,
} from '@/types/database/customHoleTees.types';

// Until DB types are regenerated, the generated client doesn't know about
// `custom_hole_tees`. Cast to bypass the `never` table type. Drop the cast
// once `pnpm gen:db-types` has run against the migrated schema.
const customTeesTable = () =>
  (supabase as unknown as { from: (table: string) => any }).from(
    'custom_hole_tees'
  );

export function useCustomHoleTees(
  courseId: string | null | undefined,
  holeNumber: number,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: customHoleTeeKeys.byCourseHole(courseId ?? '', holeNumber),
    queryFn: async (): Promise<CustomHoleTee[]> => {
      if (!courseId) return [];
      const { data, error } = await customTeesTable()
        .select('*')
        .eq('course_id', courseId)
        .eq('hole_number', holeNumber)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as CustomHoleTee[] | null) ?? [];
    },
    enabled:
      (options?.enabled ?? true) &&
      !!courseId &&
      holeNumber >= 1 &&
      holeNumber <= 18,
  });
}

/**
 * All custom tees for a given course (every hole), grouped by hole number.
 * Used by per-round screens that show all 18 holes at once.
 */
export function useCustomHoleTeesByCourse(
  courseId: string | null | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: customHoleTeeKeys.byCourse(courseId ?? ''),
    queryFn: async (): Promise<Record<number, CustomHoleTee[]>> => {
      if (!courseId) return {};
      const { data, error } = await customTeesTable()
        .select('*')
        .eq('course_id', courseId);
      if (error) throw error;
      const rows = (data as CustomHoleTee[] | null) ?? [];
      const grouped: Record<number, CustomHoleTee[]> = {};
      for (const row of rows) {
        (grouped[row.hole_number] ??= []).push(row);
      }
      return grouped;
    },
    enabled: (options?.enabled ?? true) && !!courseId,
  });
}

export function useCreateCustomHoleTee() {
  const queryClient = useQueryClient();
  const { player } = useAuth();

  return useMutation({
    mutationFn: async (
      input: CustomHoleTeeInsert
    ): Promise<CustomHoleTee> => {
      if (!player) throw new Error('Not authenticated');
      // The codebase convention is that `players.id == auth.uid()`. RLS on
      // `custom_hole_tees` requires `auth.uid() = user_id`, so set it
      // explicitly here from the authenticated player's id.
      const { data, error } = await customTeesTable()
        .insert({
          course_id: input.course_id,
          hole_number: input.hole_number,
          user_id: player.id,
          latitude: input.latitude,
          longitude: input.longitude,
          color: input.color,
        })
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Custom tee insert returned no row');
      return data as CustomHoleTee;
    },
    onSuccess: (created) => {
      // Per-(course, hole) cache — used by `useCustomHoleTees` on
      // `ShotMapScreen` and `HoleMapScreen`.
      queryClient.invalidateQueries({
        queryKey: customHoleTeeKeys.byCourseHole(
          created.course_id,
          created.hole_number
        ),
      });
      // Per-course cache — used by `useCustomHoleTeesByCourse` on
      // `ShotLogList` to compute per-shot distances on the Shots tab.
      queryClient.invalidateQueries({
        queryKey: customHoleTeeKeys.byCourse(created.course_id),
      });
      // Bag-wide per-club stats query — fetches its OWN copy of every
      // custom tee for the player. Without this invalidation, a freshly
      // created custom tee won't appear in the cached list, and any
      // override pointing at it will silently fall back to the default
      // tee in `resolveTeeAnchor` (so the Club Distance Detail screen
      // would show the wrong shot 1 distance until the cache expires).
      if (player?.id) {
        queryClient.invalidateQueries({
          queryKey: bagKeys.perClubStats(player.id),
        });
      }
    },
  });
}
