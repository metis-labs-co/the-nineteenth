/**
 * Skins Hooks - Statistics & Leaderboard Hooks
 *
 * TanStack Query hooks for skins statistics and leaderboards.
 *
 * Hooks:
 * - useSkinsStatistics: Fetch player statistics
 * - useMySkinsStatistics: Fetch current user's statistics
 * - useSkinsLeaderboard: Fetch leaderboard rankings
 * - useSkinsGameHistory: Fetch player's game history
 * - useSkinsRank: Fetch player's rank
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { skinsKeys } from '@/hooks/queryKeys';
import { createError } from './helpers';
import type {
  SkinsPlayerStatistics,
  SkinsLeaderboardEntry,
  SkinsGameHistoryEntry,
  SkinsLeaderboardOptions,
  SkinsGameHistoryOptions,
} from './types';

// =====================================================
// STATISTICS HOOKS
// =====================================================

/**
 * Query hook to fetch player skins statistics
 *
 * @param playerId - Player UUID to fetch statistics for
 * @returns Query result with SkinsPlayerStatistics or null
 */
export function useSkinsStatistics(playerId: string | undefined) {
  return useQuery({
    queryKey: skinsKeys.statistics(playerId ?? ''),
    queryFn: async (): Promise<SkinsPlayerStatistics | null> => {
      if (!playerId) return null;

      const { data, error } = await supabase.rpc('get_player_skins_stats', {
        p_player_id: playerId,
      });

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw createError(`Failed to fetch skins statistics: ${error.message}`, 'DATABASE');
      }

      return data as SkinsPlayerStatistics;
    },
    enabled: !!playerId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Convenience hook to fetch current user's skins statistics
 *
 * @returns Query result with SkinsPlayerStatistics or null
 */
export function useMySkinsStatistics() {
  const { data: session } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const userId = session?.user?.id;

  return useQuery({
    queryKey: skinsKeys.statistics(userId ?? 'self'),
    queryFn: async (): Promise<SkinsPlayerStatistics | null> => {
      if (!userId) return null;

      const { data, error } = await supabase.rpc('get_player_skins_stats', {
        p_player_id: userId,
      });

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw createError(`Failed to fetch skins statistics: ${error.message}`, 'DATABASE');
      }

      return data as SkinsPlayerStatistics;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch skins leaderboard
 *
 * @param options - Leaderboard options (limit, minGames, friendsOnly)
 * @returns Query result with array of SkinsLeaderboardEntry
 */
export function useSkinsLeaderboard(options: SkinsLeaderboardOptions = {}) {
  const { limit = 10, minGames = 1, friendsOnly = false } = options;

  const { data: session } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const userId = session?.user?.id;

  return useQuery({
    queryKey: skinsKeys.leaderboard({ friendsOnly, minGames }),
    queryFn: async (): Promise<SkinsLeaderboardEntry[]> => {
      const { data: leaderboard, error } = await supabase.rpc('get_skins_leaderboard', {
        p_limit: limit,
        p_min_games: minGames,
        p_friends_only: friendsOnly,
        p_user_id: friendsOnly ? userId ?? null : null,
      });

      if (error) {
        throw createError(`Failed to fetch skins leaderboard: ${error.message}`, 'DATABASE');
      }

      if (!leaderboard || leaderboard.length === 0) return [];

      const playerIds = leaderboard.map((entry: SkinsLeaderboardEntry) => entry.player_id);
      const { data: players } = await supabase
        .from('players')
        .select('id, name, avatar_url')
        .in('id', playerIds);

      const playerMap = new Map(
        (players ?? []).map((p) => [p.id, { id: p.id, name: p.name, avatar_url: p.avatar_url }])
      );

      return (leaderboard as SkinsLeaderboardEntry[]).map((entry) => ({
        ...entry,
        player: playerMap.get(entry.playerId),
      }));
    },
    enabled: !friendsOnly || !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch player's skins game history
 *
 * @param playerId - Player UUID to fetch history for
 * @param options - Pagination options (limit, offset)
 * @returns Query result with array of SkinsGameHistoryEntry
 */
export function useSkinsGameHistory(
  playerId: string | undefined,
  options: SkinsGameHistoryOptions = {}
) {
  const { limit = 20, offset = 0 } = options;

  return useQuery({
    queryKey: [...skinsKeys.history(playerId ?? ''), { limit, offset }],
    queryFn: async (): Promise<SkinsGameHistoryEntry[]> => {
      if (!playerId) return [];

      const { data: games, error: gamesError } = await supabase
        .from('skins_games')
        .select('*')
        .contains('participant_ids', [playerId])
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (gamesError) {
        throw createError(`Failed to fetch skins history: ${gamesError.message}`, 'DATABASE');
      }

      if (!games || games.length === 0) return [];

      const roundIds = [...new Set(games.map((g) => g.round_id))];
      const { data: rounds } = await supabase
        .from('rounds')
        .select(`
          id,
          round_number,
          date,
          course_id,
          competition_id
        `)
        .in('id', roundIds);

      const courseIds = [...new Set((rounds ?? []).map((r) => r.course_id).filter(Boolean))];
      const { data: courses } = courseIds.length > 0
        ? await supabase
            .from('courses')
            .select('id, name')
            .in('id', courseIds)
        : { data: [] };

      const competitionIds = [...new Set((rounds ?? []).map((r) => r.competition_id).filter(Boolean))];
      const { data: competitions } = competitionIds.length > 0
        ? await supabase
            .from('competitions')
            .select('id, name')
            .in('id', competitionIds)
        : { data: [] };

      const gameIds = games.map((g) => g.id);
      const { data: payouts } = await supabase
        .from('skins_payouts')
        .select('*')
        .in('skins_game_id', gameIds)
        .eq('player_id', playerId);

      const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));
      const competitionMap = new Map((competitions ?? []).map((c) => [c.id, c]));
      const roundMap = new Map(
        (rounds ?? []).map((r) => [
          r.id,
          {
            id: r.id,
            roundNumber: r.round_number,
            date: r.date,
            course: r.course_id ? courseMap.get(r.course_id) : undefined,
            competition: r.competition_id ? competitionMap.get(r.competition_id) : undefined,
          },
        ])
      );
      const payoutMap = new Map((payouts ?? []).map((p) => [p.skins_game_id, p]));

      return games.map((game) => {
        const payout = payoutMap.get(game.id);
        const round = roundMap.get(game.round_id);
        return {
          id: game.id,
          round_id: game.round_id,
          pot_type: game.pot_type,
          pot_value: game.pot_value,
          scoring_type: game.scoring_type,
          status: game.status,
          completed_at: game.completed_at,
          created_at: game.created_at,
          round: round ? {
            id: round.id,
            round_number: round.roundNumber,
            date: round.date,
            course: round.course,
            competition: round.competition,
          } : undefined,
          payout: payout
            ? {
                buy_in: payout.buy_in,
                total_winnings: payout.total_winnings,
                net_result: payout.net_result,
                holes_won: payout.holes_won,
                holes_tied: payout.holes_tied,
                holes_lost: payout.holes_lost,
              }
            : undefined,
        };
      });
    },
    enabled: !!playerId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch player's rank in the skins leaderboard
 *
 * @param playerId - Player UUID to get rank for
 * @param minGames - Minimum games to be ranked (default 1)
 * @returns Query result with rank number or null
 */
export function useSkinsRank(playerId: string | undefined, minGames: number = 1) {
  return useQuery({
    queryKey: skinsKeys.rank(playerId ?? ''),
    queryFn: async (): Promise<number | null> => {
      if (!playerId) return null;

      const { data, error } = await supabase.rpc('get_player_skins_rank', {
        p_player_id: playerId,
        p_min_games: minGames,
      });

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw createError(`Failed to fetch skins rank: ${error.message}`, 'DATABASE');
      }

      return data as number | null;
    },
    enabled: !!playerId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
