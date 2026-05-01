/**
 * Shot log mutation hooks (Phase C2).
 *
 * Optimistic update flow uses pure helpers from `./sequence` so the
 * cache producers are testable in isolation. The actual Supabase
 * round-trips are exercised by integration testing against the real
 * database; in unit tests we mock the supabase client where needed.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { shotLogKeys } from '@/hooks/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import {
  applyOptimisticInsert,
  applyOptimisticUpdate,
  applyOptimisticDelete,
} from './sequence';
import type { ShotLogEntry } from '@/types/database/shotLog.types';

// Until the supabase Database types are regenerated post-migration, the
// generated client doesn't know about `shot_log`. Cast to bypass the
// `never` table type here. Drop the cast once `pnpm gen:db-types` (or
// equivalent) has been run against the migrated schema.
const shotLogTable = () => (supabase as unknown as { from: (table: string) => any }).from('shot_log');

interface LogShotInput {
  roundId: string;
  holeNumber: number;
  latitude: number;
  longitude: number;
}

interface UpdateShotInput {
  shotId: string;
  roundId: string;
  holeNumber: number;
  latitude: number;
  longitude: number;
}

interface DeleteShotInput {
  shotId: string;
  roundId: string;
  holeNumber: number;
}

/**
 * Fetch the current max sequence for a (round, hole, player) directly
 * from the DB. Avoids the stale-cache race that bites when the user
 * navigates to a hole and taps the FAB before useShotLog has populated
 * the cache: optimistic next-sequence-from-cache returns 1, but the
 * server already has sequence-1 rows from a previous session.
 */
async function fetchMaxSequence(
  roundId: string,
  holeNumber: number,
  playerId: string
): Promise<number> {
  const { data, error } = await shotLogTable()
    .select('sequence')
    .eq('round_id', roundId)
    .eq('hole_number', holeNumber)
    .eq('player_id', playerId)
    .order('sequence', { ascending: false })
    .limit(1);

  if (error) throw error;
  return (data as { sequence: number }[] | null)?.[0]?.sequence ?? 0;
}

export function useLogShot() {
  const queryClient = useQueryClient();
  const { player } = useAuth();

  return useMutation({
    mutationFn: async (input: LogShotInput): Promise<ShotLogEntry> => {
      if (!player) throw new Error('Not authenticated');

      // Always source the next sequence from the DB, with one retry on
      // 23505 unique-violation in case two clients race or a previous
      // optimistic insert left an inconsistent cache.
      const attemptInsert = async (sequence: number) => {
        const result = await shotLogTable()
          .insert({
            round_id: input.roundId,
            hole_number: input.holeNumber,
            player_id: player.id,
            sequence,
            latitude: input.latitude,
            longitude: input.longitude,
          })
          .select()
          .single();
        return result as { data: ShotLogEntry | null; error: { code?: string } | null };
      };

      const baseSequence =
        (await fetchMaxSequence(input.roundId, input.holeNumber, player.id)) + 1;
      let { data, error } = await attemptInsert(baseSequence);

      if (error?.code === '23505') {
        const retrySequence =
          (await fetchMaxSequence(input.roundId, input.holeNumber, player.id)) + 1;
        ({ data, error } = await attemptInsert(retrySequence));
      }

      if (error) throw error;
      if (!data) throw new Error('Shot insert returned no row');
      return data;
    },
    onSuccess: (newShot, input) => {
      const cacheKey = shotLogKeys.byHole(input.roundId, input.holeNumber);
      queryClient.setQueryData<ShotLogEntry[]>(cacheKey, (existing) =>
        applyOptimisticInsert(existing ?? [], newShot)
      );
    },
  });
}

export function useUpdateShot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateShotInput): Promise<ShotLogEntry> => {
      const { data, error } = await shotLogTable()
        .update({
          latitude: input.latitude,
          longitude: input.longitude,
        })
        .eq('id', input.shotId)
        .select()
        .single();

      if (error) throw error;
      return data as ShotLogEntry;
    },
    onSuccess: (updated, input) => {
      const cacheKey = shotLogKeys.byHole(input.roundId, input.holeNumber);
      queryClient.setQueryData<ShotLogEntry[]>(cacheKey, (existing) =>
        applyOptimisticUpdate(existing ?? [], input.shotId, updated)
      );
    },
  });
}

export function useDeleteShot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteShotInput): Promise<void> => {
      const { error } = await shotLogTable().delete().eq('id', input.shotId);
      if (error) throw error;
    },
    onSuccess: (_void, input) => {
      const cacheKey = shotLogKeys.byHole(input.roundId, input.holeNumber);
      queryClient.setQueryData<ShotLogEntry[]>(cacheKey, (existing) =>
        applyOptimisticDelete(existing ?? [], input.shotId)
      );
      // Refetch from server to pick up server-side sequence compaction.
      queryClient.invalidateQueries({ queryKey: cacheKey });
    },
  });
}
