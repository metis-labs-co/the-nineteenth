/**
 * Achievement Mutation Hooks
 *
 * TanStack Query mutation hooks for achievement operations:
 * - useAwardAchievement() - Award an achievement to a player
 * - useUpdateProgress() - Update progress toward an achievement
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { achievementKeys } from '../queryKeys';
import type {
  PlayerAchievement,
  AchievementProgress,
  AwardAchievementInput,
  UpdateProgressInput,
} from '@/types/database/achievement.types';

// =====================================================
// MUTATION: AWARD ACHIEVEMENT
// =====================================================

/**
 * Mutation: Award an achievement to a player
 * Inserts a new player_achievement record
 *
 * @returns Mutation object for awarding achievements
 *
 * @example
 * ```tsx
 * const awardMutation = useAwardAchievement();
 *
 * const handleAward = () => {
 *   awardMutation.mutate({
 *     player_id: user.id,
 *     achievement_id: 'ach_first_round',
 *   });
 * };
 * ```
 */
export function useAwardAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AwardAchievementInput): Promise<PlayerAchievement> => {
      // Note: Table may not exist in Supabase types yet - using type assertion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('player_achievements')
        .insert({
          player_id: input.player_id,
          achievement_id: input.achievement_id,
          progress: input.progress ?? 0,
          earned_at: new Date().toISOString(),
          notified: false,
        })
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation (already earned)
        if (error.code === '23505') {
          throw new Error('Achievement already earned');
        }
        console.error('Error awarding achievement:', error);
        throw new Error(error.message);
      }

      return data as PlayerAchievement;
    },
    onSuccess: (data) => {
      // Invalidate player achievements and summary
      queryClient.invalidateQueries({
        queryKey: achievementKeys.playerAchievements(data.player_id),
      });
      queryClient.invalidateQueries({
        queryKey: achievementKeys.summary(data.player_id),
      });
      // Also invalidate leaderboards as points have changed
      queryClient.invalidateQueries({
        queryKey: achievementKeys.all,
        predicate: (query) => query.queryKey.includes('leaderboard'),
      });
    },
  });
}

// =====================================================
// MUTATION: UPDATE PROGRESS
// =====================================================

/**
 * Mutation: Update achievement progress
 * Upserts an achievement_progress record
 *
 * @returns Mutation object for updating progress
 *
 * @example
 * ```tsx
 * const updateProgress = useUpdateProgress();
 *
 * // Set absolute value
 * updateProgress.mutate({
 *   player_id: user.id,
 *   achievement_code: 'rounds_played',
 *   value: 10,
 * });
 *
 * // Increment value
 * updateProgress.mutate({
 *   player_id: user.id,
 *   achievement_code: 'rounds_played',
 *   value: 1,
 *   increment: true,
 * });
 * ```
 */
export function useUpdateProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProgressInput): Promise<AchievementProgress> => {
      if (input.increment) {
        // Note: RPC function may not exist in Supabase types yet - using type assertion
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc('increment_achievement_progress', {
          p_player_id: input.player_id,
          p_achievement_code: input.achievement_code,
          p_increment: input.value,
        });

        if (error) {
          console.error('Error incrementing progress:', error);
          throw new Error(error.message);
        }

        return data as AchievementProgress;
      } else {
        // Note: Table may not exist in Supabase types yet - using type assertion
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('achievement_progress')
          .upsert(
            {
              player_id: input.player_id,
              achievement_code: input.achievement_code,
              current_value: input.value,
              last_updated: new Date().toISOString(),
            },
            {
              onConflict: 'player_id,achievement_code',
            }
          )
          .select()
          .single();

        if (error) {
          console.error('Error updating progress:', error);
          throw new Error(error.message);
        }

        return data as AchievementProgress;
      }
    },
    onSuccess: (data) => {
      // Invalidate progress cache
      queryClient.invalidateQueries({
        queryKey: achievementKeys.progress(data.player_id),
      });
    },
  });
}
