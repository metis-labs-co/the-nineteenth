/**
 * Sand-save aggregate stats for a player.
 *
 * Reads counts from v_sand_saves and v_sand_save_attempts (created in
 * 20260505000001_create_sand_save_views.sql, extended with course_id in
 * 20260506000000_add_course_id_to_sand_save_views.sql) and derives a
 * percentage.
 *
 * Pass an optional `courseId` to scope counts to a single course (used
 * by CourseStatisticsScreen). When omitted, counts are global per player.
 *
 * Returns null percentage when no attempts on record.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';

export interface SandSaveStats {
  sandSaves: number;
  sandSaveAttempts: number;
  sandSavePercentage: number | null;
}

const STALE_TIME_MS = 60_000;

async function fetchSandSaveStats(
  playerId: string,
  courseId?: string
): Promise<SandSaveStats> {
  const buildSavesQuery = () => {
    const q = supabase
      .from('v_sand_saves')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId);
    return courseId ? q.eq('course_id', courseId) : q;
  };
  const buildAttemptsQuery = () => {
    const q = supabase
      .from('v_sand_save_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId);
    return courseId ? q.eq('course_id', courseId) : q;
  };

  const [savesResult, attemptsResult] = await Promise.all([
    buildSavesQuery(),
    buildAttemptsQuery(),
  ]);

  const sandSaves = savesResult.count ?? 0;
  const sandSaveAttempts = attemptsResult.count ?? 0;
  const sandSavePercentage =
    sandSaveAttempts > 0 ? (sandSaves / sandSaveAttempts) * 100 : null;

  return { sandSaves, sandSaveAttempts, sandSavePercentage };
}

export function useSandSaveStats(
  playerId: string | undefined,
  courseId?: string
) {
  return useQuery({
    queryKey: ['stats', 'sandSave', playerId, courseId ?? null],
    queryFn: () => fetchSandSaveStats(playerId as string, courseId),
    enabled: Boolean(playerId),
    staleTime: STALE_TIME_MS,
  });
}
