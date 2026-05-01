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
  nextSequence,
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

export function useLogShot() {
  const queryClient = useQueryClient();
  const { player } = useAuth();

  return useMutation({
    mutationFn: async (input: LogShotInput): Promise<ShotLogEntry> => {
      if (!player) throw new Error('Not authenticated');

      const cacheKey = shotLogKeys.byHole(input.roundId, input.holeNumber);
      const existing = queryClient.getQueryData<ShotLogEntry[]>(cacheKey);
      const sequence = nextSequence(existing);

      const { data, error } = await shotLogTable()
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

      if (error) throw error;
      return data as ShotLogEntry;
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
