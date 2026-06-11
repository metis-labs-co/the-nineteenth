/**
 * useMatesThisWeek - ranked "best Stableford round this week" for the
 * current user and their accepted friends, powering the Home screen
 * "Mates this week" section.
 *
 * Client-side query (no RPC): RLS permits reading friends' scorecards,
 * matching the pattern in useFriendStats.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { friendsKeys } from '../queryKeys';
import { useAuth } from '../useAuth';
import { useFriends } from '../useFriends';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { getWeekRange } from '@/utils/formatting';
import {
  buildMatesLeaderboard,
  type MateProfile,
  type MateWeeklyEntry,
  type WeeklyScorecardRow,
} from './matesLeaderboard';

export function useMatesThisWeek() {
  const { user, player } = useAuth();
  const { data: friends } = useFriends();
  const { start, end } = getWeekRange();
  const userId = user?.id;

  return useQuery({
    queryKey: friendsKeys.matesThisWeek(userId, start),
    queryFn: async (): Promise<MateWeeklyEntry[]> => {
      if (!userId) return [];

      const profiles = new Map<string, MateProfile>();
      profiles.set(userId, {
        name: player?.name ?? 'You',
        photoUrl: player?.photo_url ?? null,
      });
      (friends ?? []).forEach((f) => {
        profiles.set(f.id, { name: f.name, photoUrl: f.photo_url });
      });

      const { data, error } = await supabase
        .from('scorecards')
        .select(
          `
          player_id,
          total_points,
          round_id,
          round:rounds!inner(date)
        `
        )
        .in('player_id', [...profiles.keys()])
        .in('status', ['completed', 'confirmed'])
        .is('round.deleted_at', null)
        .gte('round.date', start)
        .lte('round.date', end);

      if (error) {
        console.error('Error fetching mates this week:', error);
        throw error;
      }

      return buildMatesLeaderboard(
        (data ?? []) as unknown as WeeklyScorecardRow[],
        profiles,
        userId
      );
    },
    enabled: !!userId && friends !== undefined,
    staleTime: CACHE_TIMES.STANDARD,
    gcTime: GC_TIMES.STANDARD,
  });
}
