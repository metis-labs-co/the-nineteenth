/**
 * League Stats API Service
 *
 * Fetches aggregate league statistics via the get_league_stats RPC.
 */

import { supabase } from '@/services/supabase/client';
import type { LeagueStatsResponse } from '@/types/database';

/**
 * Fetch league statistics for a given league and user
 */
export async function getLeagueStats(
  leagueId: string,
  userId: string
): Promise<LeagueStatsResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_league_stats', {
    p_league_id: leagueId,
    p_user_id: userId,
  });

  if (error) {
    console.error('[LeagueStats] Error fetching stats:', error);
    throw new Error(`Failed to fetch league stats: ${error.message}`);
  }

  return data as LeagueStatsResponse;
}
