/**
 * Achievement Utility Hooks
 *
 * Derived/convenience hooks for achievement data:
 * - useHasAchievement(playerId, achievementCode) - Check if player earned an achievement
 * - useAchievementPoints(playerId) - Get player's total achievement points
 */

import { useMemo } from 'react';
import {
  useAchievementDefinitions,
  usePlayerAchievements,
  useAchievementSummary,
} from './queries';

// =====================================================
// CONVENIENCE HOOKS
// =====================================================

/**
 * Hook: Check if player has earned a specific achievement
 *
 * @param playerId - The player's ID
 * @param achievementCode - The achievement code to check
 * @returns Boolean indicating if earned, plus loading state
 *
 * @example
 * ```tsx
 * const { hasEarned, isLoading } = useHasAchievement(user.id, 'first_round');
 * ```
 */
export function useHasAchievement(playerId: string, achievementCode: string) {
  const { data: definitions } = useAchievementDefinitions();
  const { data: earned, isLoading } = usePlayerAchievements(playerId);

  const hasEarned = useMemo(() => {
    if (!definitions || !earned) return false;

    // Find the definition with this code
    const definition = definitions.find((d) => d.code === achievementCode);
    if (!definition) return false;

    // Check if earned
    return earned.some((e) => e.achievement_id === definition.id);
  }, [definitions, earned, achievementCode]);

  return { hasEarned, isLoading };
}

/**
 * Hook: Get player's achievement points
 *
 * @param playerId - The player's ID
 * @returns Total points earned
 *
 * @example
 * ```tsx
 * const { points, isLoading } = useAchievementPoints(user.id);
 * ```
 */
export function useAchievementPoints(playerId: string) {
  const { data: summary, isLoading } = useAchievementSummary(playerId);

  return {
    points: summary?.total_points ?? 0,
    isLoading,
  };
}
