/**
 * Sand-save aggregate stats for a player.
 *
 * Reads counts from v_sand_saves and v_sand_save_attempts (created in
 * 20260505000001_create_sand_save_views.sql) and derives a percentage.
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

async function fetchSandSaveStats(playerId: string): Promise<SandSaveStats> {
  const [savesResult, attemptsResult] = await Promise.all([
    supabase
      .from('v_sand_saves')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId),
    supabase
      .from('v_sand_save_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId),
  ]);

  const sandSaves = savesResult.count ?? 0;
  const sandSaveAttempts = attemptsResult.count ?? 0;
  const sandSavePercentage =
    sandSaveAttempts > 0 ? (sandSaves / sandSaveAttempts) * 100 : null;

  return { sandSaves, sandSaveAttempts, sandSavePercentage };
}

export function useSandSaveStats(playerId: string | undefined) {
  return useQuery({
    queryKey: ['stats', 'sandSave', playerId],
    queryFn: () => fetchSandSaveStats(playerId as string),
    enabled: Boolean(playerId),
    staleTime: STALE_TIME_MS,
  });
}
