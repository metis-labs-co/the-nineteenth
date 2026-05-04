/**
 * Query + mutation hooks for the player's bag (What's in the Bag).
 *
 * Bag changes are a diff — `useUpdateBag` accepts a desired final list and
 * fans out the inserts/deletes that get from current → next.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { bagKeys } from '@/hooks/queryKeys';
import { CACHE_TIMES } from '@/constants/cacheConfig';
import { ensurePutter, diffBag } from '@/utils/bag';
import { isClubKey, type ClubKey } from '@/constants/clubs';

// Until supabase Database types are regenerated post-migration, the generated
// client doesn't know about `player_bag`. Cast to bypass the `never` table.
const playerBagTable = () =>
  (supabase as unknown as { from: (table: string) => any }).from('player_bag');

interface PlayerBagRow {
  player_id: string;
  club_key: string;
  added_at: string;
}

async function fetchBag(playerId: string): Promise<ClubKey[]> {
  const { data, error } = await playerBagTable()
    .select('club_key')
    .eq('player_id', playerId)
    .order('added_at', { ascending: true });
  if (error) throw error;
  const rows = (data as Pick<PlayerBagRow, 'club_key'>[] | null) ?? [];
  // Filter to known canonical keys; unknown legacy values are ignored client-side
  // and remain in the DB until the next save (which will diff them away).
  const keys = rows.map((r) => r.club_key).filter(isClubKey);
  // Always surface the putter — it's permanent in the bag UI even if the user
  // hasn't yet written it to the server.
  return ensurePutter(keys);
}

export function useBag(playerId: string | undefined) {
  return useQuery({
    queryKey: bagKeys.byPlayer(playerId ?? ''),
    queryFn: () => fetchBag(playerId as string),
    enabled: !!playerId,
    staleTime: CACHE_TIMES.MODERATE,
  });
}

interface UpdateBagInput {
  playerId: string;
  next: readonly ClubKey[];
}

export function useUpdateBag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playerId, next }: UpdateBagInput): Promise<ClubKey[]> => {
      const current =
        queryClient.getQueryData<ClubKey[]>(bagKeys.byPlayer(playerId)) ??
        (await fetchBag(playerId));

      // Putter is locked — never let a save remove it. Cheap defence in depth
      // on top of the UI which already prevents toggling it off.
      const desired = ensurePutter(next);
      const { adds, removes } = diffBag(current, desired);

      if (adds.length > 0) {
        const { error } = await playerBagTable().insert(
          adds.map((club_key) => ({ player_id: playerId, club_key }))
        );
        if (error) throw error;
      }

      if (removes.length > 0) {
        const { error } = await playerBagTable()
          .delete()
          .eq('player_id', playerId)
          .in('club_key', removes);
        if (error) throw error;
      }

      return desired;
    },
    onSuccess: (saved, { playerId }) => {
      queryClient.setQueryData(bagKeys.byPlayer(playerId), saved);
      queryClient.invalidateQueries({ queryKey: bagKeys.perClubStats(playerId) });
    },
  });
}
