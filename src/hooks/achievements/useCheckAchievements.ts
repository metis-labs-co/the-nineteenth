/**
 * useCheckAchievements - Achievement Checking Hook
 *
 * Integrates achievement checking with mutations for a complete workflow.
 * Takes an event type and data, checks for newly earned achievements,
 * updates progress, awards achievements, and unlocks cosmetics.
 *
 * @example
 * ```tsx
 * function ScorecardSubmission() {
 *   const { user } = useAuth();
 *   const { checkAndAward, isChecking } = useCheckAchievements(user?.id ?? '');
 *
 *   const handleSubmit = async () => {
 *     // ... submit scorecard logic ...
 *
 *     // Check for achievements
 *     const result = await checkAndAward('scorecard_submitted', {
 *       game_type: 'stableford',
 *       stableford_points: 36,
 *       gross_score: 85,
 *     });
 *
 *     // Show toasts for new achievements
 *     result.newAchievements.forEach(ach => {
 *       showToast(`Achievement Unlocked: ${ach.name}`);
 *     });
 *
 *     // Show toasts for new cosmetics
 *     result.newCosmetics.forEach(cos => {
 *       showToast(`Cosmetic Unlocked: ${cos.name}`);
 *     });
 *   };
 *
 *   return <Button onPress={handleSubmit} loading={isChecking}>Submit</Button>;
 * }
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkAchievements } from '@/services/achievements/achievementChecker';
import {
  useAchievementDefinitions,
  usePlayerAchievements,
  useAchievementProgress,
  useAwardAchievement,
  useUpdateProgress,
} from './useAchievements';
import {
  useCosmeticDefinitions,
  usePlayerCosmetics,
  useUnlockCosmetic,
} from '../cosmetics/useCosmetics';
import { useAchievementPoints } from './useAchievements';
import { achievementKeys } from '../queryKeys';
import { cosmeticKeys } from '../queryKeys';
import type {
  AchievementDefinition,
  AchievementEventType,
  AchievementEventData,
} from '@/types/database/achievement.types';
import type { CosmeticDefinition } from '@/types/database/cosmetic.types';

// =====================================================
// TYPES
// =====================================================

/**
 * Input for the checkAndAward function
 */
export interface CheckAndAwardInput {
  eventType: AchievementEventType;
  eventData: AchievementEventData;
}

/**
 * Result from the checkAndAward function
 */
export interface CheckAndAwardResult {
  /** Newly earned achievements */
  newAchievements: AchievementDefinition[];
  /** Newly unlocked cosmetics */
  newCosmetics: CosmeticDefinition[];
  /** Progress updates that were made */
  progressUpdates: {
    achievement_code: string;
    new_value: number;
    previous_value: number;
  }[];
  /** Whether any achievements or cosmetics were earned */
  hasNewRewards: boolean;
}

/**
 * Return type for useCheckAchievements hook
 */
export interface UseCheckAchievementsReturn {
  /** Function to check and award achievements */
  checkAndAward: (
    eventType: AchievementEventType,
    eventData: AchievementEventData
  ) => Promise<CheckAndAwardResult>;
  /** Whether the check is currently in progress */
  isChecking: boolean;
  /** Error from the last check, if any */
  error: Error | null;
  /** Reset the error state */
  reset: () => void;
  /** Whether the required data is still loading */
  isLoading: boolean;
  /** Whether the required data is ready */
  isReady: boolean;
}

// =====================================================
// MAIN HOOK
// =====================================================

/**
 * Hook for checking and awarding achievements.
 *
 * Combines achievement definitions, player progress, and cosmetics data
 * to check for newly earned achievements and cosmetic unlocks.
 *
 * @param playerId - The player's ID to check achievements for
 * @returns Object with checkAndAward function and loading/error states
 *
 * @example
 * ```tsx
 * const { checkAndAward, isChecking } = useCheckAchievements(playerId);
 *
 * // After completing a round
 * const result = await checkAndAward('round_completed', {
 *   game_type: 'stableford',
 *   course_id: courseId,
 *   is_competition: true,
 *   hole_count: 18,
 * });
 *
 * if (result.hasNewRewards) {
 *   // Show celebration UI
 * }
 * ```
 */
export function useCheckAchievements(playerId: string): UseCheckAchievementsReturn {
  const queryClient = useQueryClient();

  // =====================================================
  // DATA FETCHING
  // =====================================================

  // Achievement data
  const {
    data: definitions,
    isLoading: isLoadingDefinitions,
  } = useAchievementDefinitions();

  const {
    data: playerAchievements,
    isLoading: isLoadingPlayerAchievements,
  } = usePlayerAchievements(playerId);

  const {
    data: progress,
    isLoading: isLoadingProgress,
  } = useAchievementProgress(playerId);

  const {
    points: currentPoints,
    isLoading: isLoadingPoints,
  } = useAchievementPoints(playerId);

  // Cosmetic data
  const {
    data: cosmetics,
    isLoading: isLoadingCosmetics,
  } = useCosmeticDefinitions();

  const {
    data: playerCosmetics,
    isLoading: isLoadingPlayerCosmetics,
  } = usePlayerCosmetics(playerId);

  // =====================================================
  // MUTATIONS
  // =====================================================

  const awardAchievementMutation = useAwardAchievement();
  const updateProgressMutation = useUpdateProgress();
  const unlockCosmeticMutation = useUnlockCosmetic();

  // =====================================================
  // DERIVED STATE
  // =====================================================

  const isLoading = useMemo(
    () =>
      isLoadingDefinitions ||
      isLoadingPlayerAchievements ||
      isLoadingProgress ||
      isLoadingPoints ||
      isLoadingCosmetics ||
      isLoadingPlayerCosmetics,
    [
      isLoadingDefinitions,
      isLoadingPlayerAchievements,
      isLoadingProgress,
      isLoadingPoints,
      isLoadingCosmetics,
      isLoadingPlayerCosmetics,
    ]
  );

  const isReady = useMemo(
    () =>
      !!definitions &&
      !!cosmetics &&
      playerAchievements !== undefined &&
      progress !== undefined &&
      playerCosmetics !== undefined,
    [definitions, cosmetics, playerAchievements, progress, playerCosmetics]
  );

  // Pre-compute earned IDs for quick lookup
  const earnedAchievementIds = useMemo(
    () => playerAchievements?.map((pa) => pa.achievement_id) ?? [],
    [playerAchievements]
  );

  const unlockedCosmeticIds = useMemo(
    () => playerCosmetics?.map((pc) => pc.cosmetic_id) ?? [],
    [playerCosmetics]
  );

  // =====================================================
  // CHECK AND AWARD MUTATION
  // =====================================================

  const checkAndAwardMutation = useMutation({
    mutationFn: async (input: CheckAndAwardInput): Promise<CheckAndAwardResult> => {
      // Validate required data
      if (!definitions || !cosmetics) {
        throw new Error('Achievement data not loaded');
      }

      if (!playerId) {
        throw new Error('Player ID is required');
      }

      // Run the achievement check
      const checkResult = checkAchievements({
        playerId,
        eventType: input.eventType,
        eventData: input.eventData,
        currentProgress: progress ?? [],
        definitions,
        earnedAchievementIds,
        cosmetics,
        unlockedCosmeticIds,
        currentPoints,
      });

      // =====================================================
      // BATCH PROGRESS UPDATES
      // =====================================================

      // Update progress for all changed achievements
      const progressPromises = checkResult.progressUpdates.map((update) =>
        updateProgressMutation.mutateAsync({
          player_id: playerId,
          achievement_code: update.achievement_code,
          value: update.new_value,
          increment: false, // Use absolute value since we calculated it
        }).catch((error) => {
          console.error(`Failed to update progress for ${update.achievement_code}:`, error);
          // Don't throw - continue with other updates
          return null;
        })
      );

      // Wait for all progress updates (don't fail if some fail)
      await Promise.all(progressPromises);

      // =====================================================
      // AWARD NEW ACHIEVEMENTS
      // =====================================================

      const awardPromises = checkResult.newlyEarned.map((achievement) =>
        awardAchievementMutation.mutateAsync({
          player_id: playerId,
          achievement_id: achievement.id,
          progress: checkResult.progressUpdates.find(
            (u) => u.achievement_code === (achievement.base_achievement ?? achievement.code)
          )?.new_value,
        }).catch((error) => {
          // Ignore "already earned" errors
          if (error.message === 'Achievement already earned') {
            console.log(`Achievement ${achievement.code} already earned, skipping`);
            return null;
          }
          console.error(`Failed to award achievement ${achievement.code}:`, error);
          // Don't throw - continue with other awards
          return null;
        })
      );

      // Wait for all awards (filter out nulls from already earned)
      await Promise.all(awardPromises);

      // =====================================================
      // UNLOCK NEW COSMETICS
      // =====================================================

      const unlockPromises = checkResult.cosmeticUnlocks.map((cosmetic) =>
        unlockCosmeticMutation.mutateAsync({
          player_id: playerId,
          cosmetic_id: cosmetic.id,
        }).catch((error) => {
          // Ignore "already unlocked" errors
          if (error.message === 'Cosmetic already unlocked') {
            console.log(`Cosmetic ${cosmetic.code} already unlocked, skipping`);
            return null;
          }
          console.error(`Failed to unlock cosmetic ${cosmetic.code}:`, error);
          // Don't throw - continue with other unlocks
          return null;
        })
      );

      // Wait for all unlocks
      await Promise.all(unlockPromises);

      // =====================================================
      // RETURN RESULT
      // =====================================================

      return {
        newAchievements: checkResult.newlyEarned,
        newCosmetics: checkResult.cosmeticUnlocks,
        progressUpdates: checkResult.progressUpdates,
        hasNewRewards:
          checkResult.newlyEarned.length > 0 || checkResult.cosmeticUnlocks.length > 0,
      };
    },
    onSuccess: () => {
      // Invalidate relevant caches to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: achievementKeys.playerAchievements(playerId),
      });
      queryClient.invalidateQueries({
        queryKey: achievementKeys.progress(playerId),
      });
      queryClient.invalidateQueries({
        queryKey: achievementKeys.summary(playerId),
      });
      queryClient.invalidateQueries({
        queryKey: cosmeticKeys.playerCosmetics(playerId),
      });
    },
  });

  // =====================================================
  // WRAPPED CHECK FUNCTION
  // =====================================================

  const checkAndAward = useCallback(
    async (
      eventType: AchievementEventType,
      eventData: AchievementEventData
    ): Promise<CheckAndAwardResult> => {
      // Wait for data to be ready before checking
      if (!isReady) {
        console.warn('Achievement data not ready, returning empty result');
        return {
          newAchievements: [],
          newCosmetics: [],
          progressUpdates: [],
          hasNewRewards: false,
        };
      }

      return checkAndAwardMutation.mutateAsync({ eventType, eventData });
    },
    [isReady, checkAndAwardMutation]
  );

  // =====================================================
  // RETURN VALUE
  // =====================================================

  return {
    checkAndAward,
    isChecking: checkAndAwardMutation.isPending,
    error: checkAndAwardMutation.error as Error | null,
    reset: checkAndAwardMutation.reset,
    isLoading,
    isReady,
  };
}

// =====================================================
// CONVENIENCE HOOKS
// =====================================================

/**
 * Hook for checking multiple events at once.
 * Useful for batch processing or retroactive calculations.
 *
 * @param playerId - The player's ID
 * @returns Object with checkMultiple function
 *
 * @example
 * ```tsx
 * const { checkMultiple, isChecking } = useCheckMultipleAchievements(playerId);
 *
 * // After importing historical data
 * const result = await checkMultiple([
 *   { eventType: 'round_completed', eventData: { ... } },
 *   { eventType: 'birdie_recorded', eventData: { ... } },
 *   { eventType: 'birdie_recorded', eventData: { ... } },
 * ]);
 * ```
 */
export function useCheckMultipleAchievements(playerId: string) {
  const { checkAndAward, isChecking, error, reset, isLoading, isReady } =
    useCheckAchievements(playerId);

  const checkMultiple = useCallback(
    async (
      events: { eventType: AchievementEventType; eventData: AchievementEventData }[]
    ): Promise<CheckAndAwardResult> => {
      // Aggregate results
      const aggregatedResult: CheckAndAwardResult = {
        newAchievements: [],
        newCosmetics: [],
        progressUpdates: [],
        hasNewRewards: false,
      };

      // Track what we've already awarded to avoid duplicates
      const awardedAchievementIds = new Set<string>();
      const unlockedCosmeticIds = new Set<string>();

      // Process events sequentially to maintain correct progress accumulation
      for (const event of events) {
        const result = await checkAndAward(event.eventType, event.eventData);

        // Add unique achievements
        for (const achievement of result.newAchievements) {
          if (!awardedAchievementIds.has(achievement.id)) {
            awardedAchievementIds.add(achievement.id);
            aggregatedResult.newAchievements.push(achievement);
          }
        }

        // Add unique cosmetics
        for (const cosmetic of result.newCosmetics) {
          if (!unlockedCosmeticIds.has(cosmetic.id)) {
            unlockedCosmeticIds.add(cosmetic.id);
            aggregatedResult.newCosmetics.push(cosmetic);
          }
        }

        // Merge progress updates (keep latest value for each code)
        const progressMap = new Map(
          aggregatedResult.progressUpdates.map((u) => [u.achievement_code, u])
        );
        for (const update of result.progressUpdates) {
          progressMap.set(update.achievement_code, update);
        }
        aggregatedResult.progressUpdates = Array.from(progressMap.values());
      }

      aggregatedResult.hasNewRewards =
        aggregatedResult.newAchievements.length > 0 ||
        aggregatedResult.newCosmetics.length > 0;

      return aggregatedResult;
    },
    [checkAndAward]
  );

  return {
    checkMultiple,
    isChecking,
    error,
    reset,
    isLoading,
    isReady,
  };
}

/**
 * Hook that provides a pre-bound checkAndAward for specific event types.
 * Useful for components that only handle one type of event.
 *
 * @param playerId - The player's ID
 * @param eventType - The specific event type to check for
 * @returns Object with check function bound to the event type
 *
 * @example
 * ```tsx
 * const { check, isChecking } = useCheckAchievementForEvent(playerId, 'birdie_recorded');
 *
 * // When a birdie is recorded
 * const result = await check({ score_type: 'birdie' });
 * ```
 */
export function useCheckAchievementForEvent(
  playerId: string,
  eventType: AchievementEventType
) {
  const { checkAndAward, ...rest } = useCheckAchievements(playerId);

  const check = useCallback(
    (eventData: AchievementEventData) => checkAndAward(eventType, eventData),
    [checkAndAward, eventType]
  );

  return { check, ...rest };
}
