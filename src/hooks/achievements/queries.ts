/**
 * Achievement Query Hooks
 *
 * TanStack Query hooks for fetching achievement data:
 * - useAchievementDefinitions() - All achievement definitions
 * - usePlayerAchievements(playerId) - Player's earned achievements
 * - useAchievementProgress(playerId) - Player's progress toward achievements
 * - useAchievementSummary(playerId) - Combined summary with stats
 * - useAchievementLeaderboard(scope, competitionId?) - Achievement leaderboard
 * - useAchievementsByCategory(playerId, category) - Achievements by category
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { achievementKeys } from '../queryKeys';
import { useAuth } from '../useAuth';
import type {
  AchievementDefinition,
  PlayerAchievementWithDefinition,
  AchievementProgress,
  AchievementSummary,
  AchievementLeaderboardEntry,
  AchievementLeaderboardScope,
  AchievementCategory,
  CategoryProgress,
  RecentAchievement,
} from '@/types/database/achievement.types';

// =====================================================
// QUERY: ACHIEVEMENT DEFINITIONS
// =====================================================

/**
 * Query: All achievement definitions
 * Fetches all achievements ordered by category and tier
 *
 * @returns Query result with all achievement definitions
 *
 * @example
 * ```tsx
 * const { data: achievements, isLoading } = useAchievementDefinitions();
 *
 * // Group by category
 * const byCategory = achievements?.reduce((acc, ach) => {
 *   (acc[ach.category] = acc[ach.category] || []).push(ach);
 *   return acc;
 * }, {});
 * ```
 */
export function useAchievementDefinitions() {
  return useQuery({
    queryKey: achievementKeys.definitions(),
    queryFn: async (): Promise<AchievementDefinition[]> => {
      // Note: Table may not exist in Supabase types yet - using type assertion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('achievement_definitions')
        .select('*')
        .order('category')
        .order('tier');

      if (error) {
        console.error('Error fetching achievement definitions:', error);
        throw new Error(error.message);
      }

      return data as AchievementDefinition[];
    },
    staleTime: 60 * 60 * 1000, // 1 hour - definitions rarely change
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchOnWindowFocus: false,
  });
}

// =====================================================
// QUERY: PLAYER ACHIEVEMENTS
// =====================================================

/**
 * Query: Player's earned achievements
 * Fetches all achievements earned by a player with definition details
 *
 * @param playerId - The player's ID
 * @returns Query result with earned achievements and their definitions
 *
 * @example
 * ```tsx
 * const { data: earned, isLoading } = usePlayerAchievements(user.id);
 * const earnedCount = earned?.length ?? 0;
 * ```
 */
export function usePlayerAchievements(playerId: string) {
  return useQuery({
    queryKey: achievementKeys.playerAchievements(playerId),
    queryFn: async (): Promise<PlayerAchievementWithDefinition[]> => {
      // Note: Table may not exist in Supabase types yet - using type assertion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('player_achievements')
        .select(
          `
          *,
          achievement:achievement_definitions(*)
        `
        )
        .eq('player_id', playerId)
        .order('earned_at', { ascending: false });

      if (error) {
        console.error('Error fetching player achievements:', error);
        throw new Error(error.message);
      }

      return data as PlayerAchievementWithDefinition[];
    },
    enabled: !!playerId,
    staleTime: CACHE_TIMES.FREQUENT,
    gcTime: GC_TIMES.SHORT,
    refetchOnWindowFocus: true,
  });
}

// =====================================================
// QUERY: ACHIEVEMENT PROGRESS
// =====================================================

/**
 * Query: Player's achievement progress
 * Fetches current progress toward all achievements for a player
 *
 * @param playerId - The player's ID
 * @returns Query result with progress records
 *
 * @example
 * ```tsx
 * const { data: progress } = useAchievementProgress(user.id);
 * const roundsProgress = progress?.find(p => p.achievement_code === 'rounds_played');
 * console.log(`Rounds played: ${roundsProgress?.current_value}`);
 * ```
 */
export function useAchievementProgress(playerId: string) {
  return useQuery({
    queryKey: achievementKeys.progress(playerId),
    queryFn: async (): Promise<AchievementProgress[]> => {
      // Note: Table may not exist in Supabase types yet - using type assertion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('achievement_progress')
        .select('*')
        .eq('player_id', playerId);

      if (error) {
        console.error('Error fetching achievement progress:', error);
        throw new Error(error.message);
      }

      return data as AchievementProgress[];
    },
    enabled: !!playerId,
    staleTime: CACHE_TIMES.SHORT, // 30 seconds - progress changes frequently
    gcTime: GC_TIMES.SHORT, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

// =====================================================
// QUERY: ACHIEVEMENT SUMMARY
// =====================================================

/**
 * Query: Combined achievement summary
 * Combines definitions, earned achievements, and progress to create
 * a comprehensive summary for display
 *
 * @param playerId - The player's ID
 * @returns Query result with AchievementSummary
 *
 * @example
 * ```tsx
 * const { data: summary } = useAchievementSummary(user.id);
 *
 * return (
 *   <View>
 *     <Text>{summary?.total_earned} / {summary?.total_available}</Text>
 *     <Text>{summary?.total_points} points</Text>
 *     <Text>{summary?.completion_percentage.toFixed(1)}% complete</Text>
 *   </View>
 * );
 * ```
 */
export function useAchievementSummary(playerId: string) {
  const { data: definitions, isLoading: isLoadingDefs } = useAchievementDefinitions();
  const { data: earned, isLoading: isLoadingEarned } = usePlayerAchievements(playerId);
  const { data: progress, isLoading: isLoadingProgress } = useAchievementProgress(playerId);

  const summary = useMemo((): AchievementSummary | null => {
    if (!definitions || !earned) return null;

    // Calculate totals
    const totalAvailable = definitions.filter((d) => !d.is_hidden).length;
    const totalEarned = earned.length;
    const totalPoints = earned.reduce((sum, e) => sum + (e.achievement?.points ?? 0), 0);
    const completionPercentage = totalAvailable > 0 ? (totalEarned / totalAvailable) * 100 : 0;

    // Get recent achievements (last 5)
    const recentAchievements: RecentAchievement[] = earned.slice(0, 5).map((e) => ({
      achievement_id: e.achievement_id,
      name: e.achievement?.name ?? 'Unknown',
      icon: e.achievement?.icon ?? 'trophy',
      earned_at: e.earned_at,
      points: e.achievement?.points ?? 0,
    }));

    // Calculate by category
    const byCategory: Record<AchievementCategory, CategoryProgress> = {
      rounds: { earned: 0, total: 0 },
      game_types: { earned: 0, total: 0 },
      scoring: { earned: 0, total: 0 },
      competitions: { earned: 0, total: 0 },
      social: { earned: 0, total: 0 },
      courses: { earned: 0, total: 0 },
      match_play: { earned: 0, total: 0 },
      streaks: { earned: 0, total: 0 },
      milestones: { earned: 0, total: 0 },
      side_games: { earned: 0, total: 0 },
      leagues: { earned: 0, total: 0 },
    };

    // Count totals per category (non-hidden only)
    for (const def of definitions) {
      if (!def.is_hidden) {
        byCategory[def.category].total += 1;
      }
    }

    // Count earned per category
    const earnedIds = new Set(earned.map((e) => e.achievement_id));
    for (const def of definitions) {
      if (earnedIds.has(def.id)) {
        byCategory[def.category].earned += 1;
      }
    }

    return {
      total_earned: totalEarned,
      total_available: totalAvailable,
      total_points: totalPoints,
      completion_percentage: completionPercentage,
      recent_achievements: recentAchievements,
      by_category: byCategory,
    };
  }, [definitions, earned]);

  return {
    data: summary,
    isLoading: isLoadingDefs || isLoadingEarned || isLoadingProgress,
    definitions,
    earned,
    progress,
  };
}

// =====================================================
// QUERY: ACHIEVEMENT LEADERBOARD
// =====================================================

/**
 * Query: Achievement leaderboard
 * Fetches ranked list of players by achievement points
 *
 * @param scope - 'global' | 'friends' | 'competition'
 * @param competitionId - Required when scope is 'competition'
 * @returns Query result with leaderboard entries
 *
 * @example
 * ```tsx
 * // Global leaderboard
 * const { data: global } = useAchievementLeaderboard('global');
 *
 * // Friends leaderboard
 * const { data: friends } = useAchievementLeaderboard('friends');
 *
 * // Competition leaderboard
 * const { data: comp } = useAchievementLeaderboard('competition', competitionId);
 * ```
 */
export function useAchievementLeaderboard(
  scope: AchievementLeaderboardScope,
  competitionId?: string
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: achievementKeys.leaderboard(scope, user?.id, competitionId),
    queryFn: async (): Promise<AchievementLeaderboardEntry[]> => {
      // Note: RPC function may not exist in Supabase types yet - using type assertion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_achievement_leaderboard', {
        p_scope: scope,
        p_user_id: user?.id ?? null,
        p_competition_id: scope === 'competition' ? competitionId : null,
      });

      if (error) {
        console.error('Error fetching achievement leaderboard:', error);
        throw new Error(error.message);
      }

      // Map the RPC result to our type
      interface LeaderboardRow {
        rank: number;
        player_id: string;
        name: string;
        photo_url: string | null;
        total_points: number;
        achievements_earned: number;
        last_achievement_at: string | null;
      }

      return ((data ?? []) as LeaderboardRow[]).map((row) => ({
        rank: row.rank,
        player_id: row.player_id,
        name: row.name,
        photo_url: row.photo_url,
        total_points: row.total_points,
        achievements_earned: row.achievements_earned,
        last_achievement_at: row.last_achievement_at,
      }));
    },
    enabled: !!user?.id && (scope !== 'competition' || !!competitionId),
    staleTime: CACHE_TIMES.FREQUENT,
    gcTime: GC_TIMES.SHORT,
    refetchOnWindowFocus: true,
  });
}

// =====================================================
// QUERY: ACHIEVEMENTS BY CATEGORY
// =====================================================

/**
 * Hook: Get achievements by category for a player
 *
 * @param playerId - The player's ID
 * @param category - The category to filter
 * @returns Achievements in category with earned status
 *
 * @example
 * ```tsx
 * const { achievements, isLoading } = useAchievementsByCategory(user.id, 'scoring');
 * ```
 */
export function useAchievementsByCategory(playerId: string, category: AchievementCategory) {
  const { data: definitions } = useAchievementDefinitions();
  const { data: earned, isLoading } = usePlayerAchievements(playerId);

  const achievements = useMemo(() => {
    if (!definitions) return [];

    const earnedIds = new Set(earned?.map((e) => e.achievement_id) ?? []);

    return definitions
      .filter((d) => d.category === category && !d.is_hidden)
      .map((d) => ({
        ...d,
        earned: earnedIds.has(d.id),
        earned_at: earned?.find((e) => e.achievement_id === d.id)?.earned_at ?? null,
      }));
  }, [definitions, earned, category]);

  return { achievements, isLoading };
}
