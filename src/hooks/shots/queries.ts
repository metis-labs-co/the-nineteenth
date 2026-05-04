/**
 * Shot log query hooks (Phase C2).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { shotLogKeys } from '@/hooks/queryKeys';
import { CACHE_TIMES } from '@/constants/cacheConfig';
import type { ShotLogEntry } from '@/types/database/shotLog.types';

/**
 * Fetch all shots for a specific (round, hole) sorted by sequence ascending.
 * Returns empty array when no shots exist yet.
 */
// Until the supabase Database types are regenerated post-migration, the
// generated client doesn't know about `shot_log`. Cast to bypass.
const shotLogTable = () =>
  (supabase as unknown as { from: (table: string) => any }).from('shot_log');

export async function fetchShotLog(
  roundId: string,
  holeNumber: number
): Promise<ShotLogEntry[]> {
  const { data, error } = await shotLogTable()
    .select('*')
    .eq('round_id', roundId)
    .eq('hole_number', holeNumber)
    .order('sequence', { ascending: true });

  if (error) throw error;
  return (data as ShotLogEntry[] | null) ?? [];
}

export function useShotLog(roundId: string, holeNumber: number) {
  return useQuery({
    queryKey: shotLogKeys.byHole(roundId, holeNumber),
    queryFn: () => fetchShotLog(roundId, holeNumber),
    enabled: !!roundId && holeNumber >= 1 && holeNumber <= 18,
    staleTime: CACHE_TIMES.MODERATE,
  });
}

/**
 * Fetch every shot for a round (all holes, all players) sorted by
 * (hole, player, sequence). Used by the Shots tab on Review Scorecard
 * and View Round screens.
 */
export async function fetchShotLogByRound(roundId: string): Promise<ShotLogEntry[]> {
  const { data, error } = await shotLogTable()
    .select('*')
    .eq('round_id', roundId)
    .order('hole_number', { ascending: true })
    .order('player_id', { ascending: true })
    .order('sequence', { ascending: true });

  if (error) throw error;
  return (data as ShotLogEntry[] | null) ?? [];
}

export function useShotLogByRound(roundId: string | undefined) {
  return useQuery({
    queryKey: shotLogKeys.byRound(roundId ?? ''),
    queryFn: () => fetchShotLogByRound(roundId as string),
    enabled: !!roundId,
    staleTime: CACHE_TIMES.MODERATE,
  });
}
