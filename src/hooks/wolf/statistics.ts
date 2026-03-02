/**
 * Wolf Hooks - Statistics Hooks
 *
 * TanStack Query hooks for wolf game statistics and history.
 *
 * Hooks:
 * - useWolfStatistics: Fetch player wolf statistics
 * - useWolfGameHistory: Fetch player's wolf game history
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { wolfKeys } from '@/hooks/queryKeys';
import { createError } from './helpers';
import type {
  WolfPlayerStatistics,
  WolfGameHistoryEntry,
  WolfGameHistoryOptions,
} from './types';
import type { WolfGame } from '@/types/database/wolf.types';

// =====================================================
// LOCAL DB ROW TYPES
// =====================================================

type WolfGameRow = WolfGame;

interface RoundRow {
  id: string;
  round_number: number;
  date: string | null;
  course_id: string | null;
  competition_id: string | null;
}

interface CourseRow {
  id: string;
  name: string;
}

interface CompetitionRow {
  id: string;
  name: string;
}

interface WolfPayoutRow {
  id: string;
  wolf_game_id: string;
  player_id: string;
  total_points: number;
  total_winnings: number;
  net_result: number;
}

// =====================================================
// STATISTICS HOOKS
// =====================================================

/**
 * Query hook to fetch player wolf statistics
 *
 * @param playerId - Player UUID to fetch statistics for
 * @returns Query result with WolfPlayerStatistics or null
 */
export function useWolfStatistics(playerId: string | undefined) {
  return useQuery({
    queryKey: wolfKeys.statistics(playerId ?? ''),
    queryFn: async (): Promise<WolfPlayerStatistics | null> => {
      if (!playerId) return null;

      const { data, error } = await supabase.rpc('get_player_wolf_stats' as never, {
        p_player_id: playerId,
      } as never);

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw createError(`Failed to fetch wolf statistics: ${error.message}`, 'DATABASE');
      }

      return data as unknown as WolfPlayerStatistics;
    },
    enabled: !!playerId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook to fetch player's wolf game history
 *
 * @param playerId - Player UUID to fetch history for
 * @param options - Pagination options (limit, offset)
 * @returns Query result with array of WolfGameHistoryEntry
 */
export function useWolfGameHistory(
  playerId: string | undefined,
  options: WolfGameHistoryOptions = {}
) {
  const { limit = 20, offset = 0 } = options;

  return useQuery({
    queryKey: [...wolfKeys.history(playerId ?? ''), { limit, offset }],
    queryFn: async (): Promise<WolfGameHistoryEntry[]> => {
      if (!playerId) return [];

      // Fetch completed wolf games where player participated
      const { data: rawGames, error: gamesError } = await supabase
        .from('wolf_games')
        .select('*')
        .contains('participant_ids', [playerId])
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (gamesError) {
        throw createError(`Failed to fetch wolf history: ${gamesError.message}`, 'DATABASE');
      }

      const games = (rawGames ?? []) as unknown as WolfGameRow[];
      if (games.length === 0) return [];

      // Fetch related rounds
      const roundIds = [...new Set(games.map((g) => g.round_id))];
      const { data: rawRounds } = await supabase
        .from('rounds')
        .select('id, round_number, date, course_id, competition_id')
        .in('id', roundIds);

      const rounds = (rawRounds ?? []) as unknown as RoundRow[];

      // Fetch courses
      const courseIds = [...new Set(rounds.map((r) => r.course_id).filter(Boolean))] as string[];
      const { data: rawCourses } = courseIds.length > 0
        ? await supabase
            .from('courses')
            .select('id, name')
            .in('id', courseIds)
        : { data: [] };

      const courses = (rawCourses ?? []) as unknown as CourseRow[];

      // Fetch competitions
      const competitionIds = [...new Set(rounds.map((r) => r.competition_id).filter(Boolean))] as string[];
      const { data: rawCompetitions } = competitionIds.length > 0
        ? await supabase
            .from('competitions')
            .select('id, name')
            .in('id', competitionIds)
        : { data: [] };

      const competitions = (rawCompetitions ?? []) as unknown as CompetitionRow[];

      // Fetch payouts for this player
      const gameIds = games.map((g) => g.id);
      const { data: rawPayouts } = await supabase
        .from('wolf_payouts')
        .select('*')
        .in('wolf_game_id', gameIds)
        .eq('player_id', playerId);

      const payouts = (rawPayouts ?? []) as unknown as WolfPayoutRow[];

      // Build lookup maps
      const courseMap = new Map(courses.map((c) => [c.id, c]));
      const competitionMap = new Map(competitions.map((c) => [c.id, c]));
      const roundMap = new Map(
        rounds.map((r) => [
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
      const payoutMap = new Map(payouts.map((p) => [p.wolf_game_id, p]));

      return games.map((game) => {
        const payout = payoutMap.get(game.id);
        const round = roundMap.get(game.round_id);
        return {
          id: game.id,
          round_id: game.round_id,
          scoring_type: game.scoring_type,
          pot_enabled: game.pot_enabled,
          pot_value_per_point: game.pot_value_per_point,
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
                total_points: payout.total_points,
                total_winnings: payout.total_winnings,
                net_result: payout.net_result,
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
