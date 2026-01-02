/**
 * Achievement Calculations Utility
 *
 * Pure functions for achievement-related calculations.
 * Used for progress tracking, tier management, and cosmetic unlocks.
 */

import type {
  AchievementCategory,
  AchievementDefinition,
  AchievementProgress,
  PlayerAchievement,
} from '@/types/database/achievement.types';
import type { CosmeticDefinition } from '@/types/database/cosmetic.types';

// =====================================================
// TYPES
// =====================================================

/**
 * Result of calculating achievement progress
 */
export interface AchievementProgressResult {
  /** The achievement definition */
  achievement: AchievementDefinition;
  /** Whether the achievement has been earned */
  earned: boolean;
  /** Progress percentage (0-100) */
  progress: number;
}

/**
 * Map of achievement base codes to current progress values
 */
export type ProgressMap = Map<string, number> | Record<string, number>;

// =====================================================
// PROGRESS CALCULATION
// =====================================================

/**
 * Calculates progress for multiple achievements based on current value.
 *
 * @param currentValue - The current progress value to check against thresholds
 * @param achievements - Array of achievement definitions to calculate progress for
 * @returns Array of progress results with earned status and percentage
 *
 * @example
 * ```typescript
 * const achievements = [
 *   { code: 'rounds_1', threshold: 1, ... },
 *   { code: 'rounds_10', threshold: 10, ... },
 * ];
 * const results = calculateAchievementProgress(5, achievements);
 * // [{ achievement: {...}, earned: true, progress: 100 },
 * //  { achievement: {...}, earned: false, progress: 50 }]
 * ```
 */
export function calculateAchievementProgress(
  currentValue: number,
  achievements: AchievementDefinition[]
): AchievementProgressResult[] {
  return achievements.map((achievement) => {
    const earned = checkThresholdMet(currentValue, achievement.threshold);
    const progress = earned
      ? 100
      : Math.min(100, Math.floor((currentValue / achievement.threshold) * 100));

    return {
      achievement,
      earned,
      progress,
    };
  });
}

/**
 * Checks if a threshold has been met.
 *
 * @param currentValue - The current progress value
 * @param threshold - The threshold to check against
 * @returns True if currentValue >= threshold
 *
 * @example
 * ```typescript
 * checkThresholdMet(10, 5);  // true
 * checkThresholdMet(3, 5);   // false
 * checkThresholdMet(5, 5);   // true
 * ```
 */
export function checkThresholdMet(currentValue: number, threshold: number): boolean {
  return currentValue >= threshold;
}

// =====================================================
// TIER MANAGEMENT
// =====================================================

/**
 * Gets the next tier achievement for a given base code.
 *
 * Achievements can have multiple tiers (e.g., play 1 round, 10 rounds, 50 rounds).
 * This function finds the next tier above the current one.
 *
 * @param baseCode - The base achievement code (without tier suffix)
 * @param currentTier - The current tier number (0 if none earned)
 * @param allDefinitions - All achievement definitions to search
 * @returns The next tier achievement definition, or null if none exists
 *
 * @example
 * ```typescript
 * const next = getNextTierAchievement('rounds', 1, definitions);
 * // Returns tier 2 achievement or null if tier 1 is the max
 * ```
 */
export function getNextTierAchievement(
  baseCode: string,
  currentTier: number,
  allDefinitions: AchievementDefinition[]
): AchievementDefinition | null {
  const nextTierAchievement = allDefinitions.find(
    (def) => def.base_achievement === baseCode && def.tier === currentTier + 1
  );

  return nextTierAchievement ?? null;
}

// =====================================================
// POINTS CALCULATION
// =====================================================

/**
 * Calculates total points from earned achievements.
 *
 * @param earnedAchievements - Array of player achievements with their definitions
 * @returns Total points sum
 *
 * @example
 * ```typescript
 * const earned = [
 *   { id: '1', achievement: { points: 10 } },
 *   { id: '2', achievement: { points: 25 } },
 * ];
 * const total = calculateTotalPoints(earned); // 35
 * ```
 */
export function calculateTotalPoints(
  earnedAchievements: (PlayerAchievement & { achievement?: AchievementDefinition })[]
): number {
  return earnedAchievements.reduce((sum, pa) => {
    return sum + (pa.achievement?.points ?? 0);
  }, 0);
}

// =====================================================
// GROUPING & FILTERING
// =====================================================

/**
 * Groups achievements by their category.
 *
 * @param achievements - Array of achievement definitions to group
 * @returns Record mapping categories to arrays of achievements
 *
 * @example
 * ```typescript
 * const grouped = groupAchievementsByCategory(achievements);
 * // { rounds: [...], scoring: [...], social: [...] }
 * ```
 */
export function groupAchievementsByCategory(
  achievements: AchievementDefinition[]
): Record<AchievementCategory, AchievementDefinition[]> {
  const categories: AchievementCategory[] = [
    'rounds',
    'game_types',
    'scoring',
    'competitions',
    'social',
    'courses',
    'match_play',
    'streaks',
    'milestones',
  ];

  const result = {} as Record<AchievementCategory, AchievementDefinition[]>;

  // Initialize all categories with empty arrays
  for (const category of categories) {
    result[category] = [];
  }

  // Group achievements into their categories
  for (const achievement of achievements) {
    if (result[achievement.category]) {
      result[achievement.category].push(achievement);
    }
  }

  return result;
}

/**
 * Gets the current progress value for a base achievement code.
 *
 * @param baseCode - The base achievement code to look up
 * @param progressMap - Map or record of achievement codes to progress values
 * @returns The current value, or 0 if not found
 *
 * @example
 * ```typescript
 * const progressMap = new Map([['rounds', 15], ['birdies', 5]]);
 * getAchievementProgress('rounds', progressMap);  // 15
 * getAchievementProgress('eagles', progressMap);  // 0
 * ```
 */
export function getAchievementProgress(baseCode: string, progressMap: ProgressMap): number {
  if (progressMap instanceof Map) {
    return progressMap.get(baseCode) ?? 0;
  }
  return progressMap[baseCode] ?? 0;
}

/**
 * Filters achievements to only those not yet earned.
 *
 * @param allDefinitions - All achievement definitions
 * @param earnedIds - Set or array of already earned achievement IDs
 * @returns Array of achievement definitions not yet earned
 *
 * @example
 * ```typescript
 * const earnable = filterEarnableAchievements(definitions, ['id1', 'id2']);
 * // Returns definitions not in the earned list
 * ```
 */
export function filterEarnableAchievements(
  allDefinitions: AchievementDefinition[],
  earnedIds: string[] | Set<string>
): AchievementDefinition[] {
  const earnedSet = earnedIds instanceof Set ? earnedIds : new Set(earnedIds);

  return allDefinitions.filter((def) => !earnedSet.has(def.id));
}

// =====================================================
// COMPLETION TRACKING
// =====================================================

/**
 * Calculates completion percentage.
 *
 * @param earned - Number of earned items
 * @param total - Total number of items
 * @returns Percentage (0-100), returns 0 if total is 0
 *
 * @example
 * ```typescript
 * calculateCompletionPercentage(5, 20);  // 25
 * calculateCompletionPercentage(0, 10);  // 0
 * calculateCompletionPercentage(10, 0);  // 0
 * ```
 */
export function calculateCompletionPercentage(earned: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Math.floor((earned / total) * 100);
}

// =====================================================
// COSMETIC UNLOCKS
// =====================================================

/**
 * Checks which cosmetics can be newly unlocked based on total points.
 *
 * @param totalPoints - The player's total achievement points
 * @param cosmetics - All cosmetic definitions
 * @param unlockedIds - IDs of already unlocked cosmetics
 * @returns Array of cosmetic definitions that can now be unlocked
 *
 * @example
 * ```typescript
 * const newUnlocks = checkCosmeticUnlocks(500, cosmetics, ['id1']);
 * // Returns cosmetics with points_required <= 500 not in unlockedIds
 * ```
 */
export function checkCosmeticUnlocks(
  totalPoints: number,
  cosmetics: CosmeticDefinition[],
  unlockedIds: string[] | Set<string>
): CosmeticDefinition[] {
  const unlockedSet = unlockedIds instanceof Set ? unlockedIds : new Set(unlockedIds);

  return cosmetics.filter(
    (cosmetic) => cosmetic.points_required <= totalPoints && !unlockedSet.has(cosmetic.id)
  );
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Creates a progress map from an array of achievement progress records.
 *
 * @param progressRecords - Array of achievement progress records
 * @returns Map of achievement codes to current values
 *
 * @example
 * ```typescript
 * const progressMap = createProgressMap(progressRecords);
 * // Map { 'rounds' => 15, 'birdies' => 5 }
 * ```
 */
export function createProgressMap(progressRecords: AchievementProgress[]): Map<string, number> {
  const map = new Map<string, number>();

  for (const record of progressRecords) {
    map.set(record.achievement_code, record.current_value);
  }

  return map;
}

/**
 * Gets achievements sorted by progress (closest to completion first).
 *
 * @param achievements - Achievement progress results to sort
 * @returns Sorted array with highest progress (non-earned) first
 *
 * @example
 * ```typescript
 * const sorted = sortByProgress(progressResults);
 * // Non-earned achievements sorted by progress descending
 * ```
 */
export function sortByProgress(
  achievements: AchievementProgressResult[]
): AchievementProgressResult[] {
  return [...achievements]
    .filter((a) => !a.earned)
    .sort((a, b) => b.progress - a.progress);
}

/**
 * Gets the next achievement to earn in a category based on progress.
 *
 * @param category - The achievement category
 * @param progressMap - Map of achievement codes to progress values
 * @param allDefinitions - All achievement definitions
 * @param earnedIds - IDs of already earned achievements
 * @returns The next closest achievement to earn, or null if all earned
 */
export function getNextAchievementInCategory(
  category: AchievementCategory,
  progressMap: ProgressMap,
  allDefinitions: AchievementDefinition[],
  earnedIds: string[] | Set<string>
): AchievementDefinition | null {
  const categoryAchievements = allDefinitions.filter((def) => def.category === category);
  const earnable = filterEarnableAchievements(categoryAchievements, earnedIds);

  if (earnable.length === 0) {
    return null;
  }

  // Find the one with highest progress
  let bestAchievement: AchievementDefinition | null = null;
  let bestProgress = -1;

  for (const achievement of earnable) {
    const baseCode = achievement.base_achievement ?? achievement.code;
    const currentValue = getAchievementProgress(baseCode, progressMap);
    const progress =
      achievement.threshold > 0
        ? Math.min(100, Math.floor((currentValue / achievement.threshold) * 100))
        : 0;

    if (progress > bestProgress) {
      bestProgress = progress;
      bestAchievement = achievement;
    }
  }

  return bestAchievement;
}
