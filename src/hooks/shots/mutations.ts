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
import { shotLogKeys, bagKeys } from '@/hooks/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import {
  applyOptimisticInsert,
  applyOptimisticUpdate,
  applyOptimisticDelete,
} from './sequence';
import type { ShotLogEntry } from '@/types/database/shotLog.types';
import type { ClubKey } from '@/constants/clubs';

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
  /** Required: the canonical club key the player hit. Drives per-club analytics. */
  clubKey: ClubKey;
  /** Reported GPS accuracy (metres) at capture time, or null when unavailable. */
  accuracyMeters?: number | null;
  /**
   * For shot 1 only: the tee origin choice ('back'/'front'/customTeeId) so
   * it persists with the shot row and follows the user across devices. If
   * the host knows the player's selection at log-time it should pass it
   * here; ignored when sequence ≠ 1.
   */
  teeOverride?: string | null;
}

interface UpdateShotInput {
  shotId: string;
  roundId: string;
  holeNumber: number;
  latitude?: number;
  longitude?: number;
  /**
   * Patch the tee origin column on shot 1. Pass `null` to clear (revert to
   * default tee). Omit to leave unchanged.
   */
  teeOverride?: string | null;
}

interface SetShotClubInput {
  shotId: string;
  roundId: string;
  holeNumber: number;
  clubKey: ClubKey;
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
            club_used: input.clubKey,
            accuracy_meters: input.accuracyMeters ?? null,
            // Persist the tee origin choice on shot 1 so it follows the
            // user across devices. NULL on later shots — the column is
            // ignored there but harmless.
            tee_override: sequence === 1 ? input.teeOverride ?? null : null,
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
      queryClient.invalidateQueries({ queryKey: shotLogKeys.byRound(input.roundId) });
      if (player) {
        queryClient.invalidateQueries({ queryKey: bagKeys.perClubStats(player.id) });
      }
    },
  });
}

export function useSetShotClub() {
  const queryClient = useQueryClient();
  const { player } = useAuth();

  return useMutation({
    mutationFn: async (input: SetShotClubInput): Promise<ShotLogEntry> => {
      const { data, error } = await shotLogTable()
        .update({ club_used: input.clubKey })
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
      queryClient.invalidateQueries({ queryKey: shotLogKeys.byRound(input.roundId) });
      if (player) {
        queryClient.invalidateQueries({ queryKey: bagKeys.perClubStats(player.id) });
      }
    },
  });
}

export function useUpdateShot() {
  const queryClient = useQueryClient();
  const { player } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateShotInput): Promise<ShotLogEntry> => {
      // Build the patch from whichever fields the caller supplied. A
      // coordinate move clears `accuracy_meters` (manual repositions are
      // user-trusted); a pure tee-override patch leaves accuracy alone.
      const patch: Record<string, unknown> = {};
      if (input.latitude !== undefined && input.longitude !== undefined) {
        patch.latitude = input.latitude;
        patch.longitude = input.longitude;
        patch.accuracy_meters = null;
      }
      if (input.teeOverride !== undefined) {
        patch.tee_override = input.teeOverride;
      }
      const { data, error } = await shotLogTable()
        .update(patch)
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
      queryClient.invalidateQueries({ queryKey: shotLogKeys.byRound(input.roundId) });
      if (player) {
        // Distance changes when a shot moves — refresh per-club stats.
        queryClient.invalidateQueries({ queryKey: bagKeys.perClubStats(player.id) });
      }
    },
  });
}

export function useDeleteShot() {
  const queryClient = useQueryClient();
  const { player } = useAuth();

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
      queryClient.invalidateQueries({ queryKey: shotLogKeys.byRound(input.roundId) });
      if (player) {
        queryClient.invalidateQueries({ queryKey: bagKeys.perClubStats(player.id) });
      }
    },
  });
}
