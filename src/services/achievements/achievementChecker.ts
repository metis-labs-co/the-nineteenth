/**
 * Achievement Checker Service
 *
 * Orchestrates achievement checking by combining category matching
 * and progress calculation. All functions are pure for testability.
 */

import type {
  AchievementDefinition,
  AchievementEventData,
  AchievementEventType,
  AchievementProgress,
  AchievementProgressUpdate,
} from '@/types/database/achievement.types';
import type { CosmeticDefinition } from '@/types/database/cosmetic.types';
import {
  checkThresholdMet,
  createProgressMap,
  filterEarnableAchievements,
} from '@/utils/achievementCalculations';

// Re-export submodule contents for backward compatibility
export { EVENT_CATEGORY_MAP, EVENT_ACHIEVEMENT_MAP, getRelevantAchievements } from './categoryMatching';
export { getProgressIncrement, calculateNewProgress } from './progressCalculation';

import { getRelevantAchievements } from './categoryMatching';
import { getProgressIncrement, calculateNewProgress } from './progressCalculation';

// =====================================================
// TYPES
// =====================================================

/**
 * Result of checking achievements for an event
 */
export interface AchievementCheckResult {
  /** Progress updates to persist */
  progressUpdates: AchievementProgressUpdate[];
  /** Newly earned achievements */
  newlyEarned: AchievementDefinition[];
  /** Newly unlocked cosmetics */
  cosmeticUnlocks: CosmeticDefinition[];
}

/**
 * Input for achievement checking
 */
export interface CheckAchievementsInput {
  playerId: string;
  eventType: AchievementEventType;
  eventData: AchievementEventData;
  currentProgress: AchievementProgress[];
  definitions: AchievementDefinition[];
  earnedAchievementIds: string[];
  cosmetics: CosmeticDefinition[];
  unlockedCosmeticIds: string[];
  currentPoints: number;
}

// =====================================================
// MAIN CHECK FUNCTION
// =====================================================

/**
 * Main achievement checking function.
 * Checks relevant achievements for an event, calculates new progress,
 * and returns newly earned achievements and cosmetic unlocks.
 *
 * @param input - All data needed to check achievements
 * @returns Progress updates, newly earned achievements, and cosmetic unlocks
 *
 * @example
 * ```typescript
 * const result = checkAchievements({
 *   playerId: 'player-123',
 *   eventType: 'round_completed',
 *   eventData: { game_type: 'stableford', course_id: 'course-1' },
 *   currentProgress: [...],
 *   definitions: [...],
 *   earnedAchievementIds: ['ach-1', 'ach-2'],
 *   cosmetics: [...],
 *   unlockedCosmeticIds: ['cos-1'],
 *   currentPoints: 150,
 * });
 * // result.newlyEarned contains newly unlocked achievements
 * // result.progressUpdates contains progress to persist
 * // result.cosmeticUnlocks contains newly unlocked cosmetics
 * ```
 */
export function checkAchievements(input: CheckAchievementsInput): AchievementCheckResult {
  const {
    eventType,
    eventData,
    currentProgress,
    definitions,
    earnedAchievementIds,
    cosmetics,
    unlockedCosmeticIds,
    currentPoints,
  } = input;

  // 1. Filter definitions relevant to this event type
  const relevantAchievements = getRelevantAchievements(eventType, definitions);

  // 2. Get earnable achievements (filter out already earned)
  const earnableAchievements = filterEarnableAchievements(relevantAchievements, earnedAchievementIds);

  // 3. Create progress map for quick lookup
  const progressMap = createProgressMap(currentProgress);

  // 4. Calculate progress updates and check thresholds
  const progressUpdates: AchievementProgressUpdate[] = [];
  const newlyEarned: AchievementDefinition[] = [];
  let pointsGained = 0;

  // Group earnable achievements by base code
  const achievementsByBase = groupByBaseCode(earnableAchievements);

  for (const [baseCode, achievements] of Object.entries(achievementsByBase)) {
    // Get increment for this base achievement
    const increment = getProgressIncrement(eventType, eventData, baseCode);

    if (increment <= 0) {
      continue;
    }

    // Calculate new progress
    const currentValue = progressMap.get(baseCode) ?? 0;
    const newValue = calculateNewProgress(currentValue, increment);

    // Add progress update
    progressUpdates.push({
      achievement_code: baseCode,
      new_value: newValue,
      previous_value: currentValue,
    });

    // Check which tier achievements are now earned
    for (const achievement of achievements) {
      if (checkThresholdMet(newValue, achievement.threshold)) {
        newlyEarned.push(achievement);
        pointsGained += achievement.points;
      }
    }
  }

  // 5. Check for new cosmetic unlocks based on new total points
  const newTotalPoints = currentPoints + pointsGained;
  const cosmeticUnlocks = checkCosmeticUnlocksFromPoints(
    newTotalPoints,
    cosmetics,
    unlockedCosmeticIds
  );

  return {
    progressUpdates,
    newlyEarned,
    cosmeticUnlocks,
  };
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Groups achievements by their base code.
 * Achievements with tiers share a base_achievement code.
 */
function groupByBaseCode(
  achievements: AchievementDefinition[]
): Record<string, AchievementDefinition[]> {
  const result: Record<string, AchievementDefinition[]> = {};

  for (const achievement of achievements) {
    const baseCode = achievement.base_achievement ?? achievement.code;

    if (!result[baseCode]) {
      result[baseCode] = [];
    }
    result[baseCode].push(achievement);
  }

  return result;
}

/**
 * Checks which cosmetics can be unlocked based on new total points.
 */
function checkCosmeticUnlocksFromPoints(
  totalPoints: number,
  cosmetics: CosmeticDefinition[],
  unlockedCosmeticIds: string[]
): CosmeticDefinition[] {
  const unlockedSet = new Set(unlockedCosmeticIds);

  return cosmetics.filter(
    (cosmetic) => cosmetic.points_required <= totalPoints && !unlockedSet.has(cosmetic.id)
  );
}

// =====================================================
// BATCH CHECKING
// =====================================================

/**
 * Check achievements for multiple events at once.
 * Useful for retroactive calculation or batch processing.
 *
 * @param events - Array of events to process
 * @param input - Base input (definitions, cosmetics, etc.)
 * @returns Combined result across all events
 */
export function checkAchievementsBatch(
  events: { eventType: AchievementEventType; eventData: AchievementEventData }[],
  input: Omit<CheckAchievementsInput, 'eventType' | 'eventData'>
): AchievementCheckResult {
  const allProgressUpdates: Map<string, AchievementProgressUpdate> = new Map();
  const allNewlyEarned: Map<string, AchievementDefinition> = new Map();
  let runningPoints = input.currentPoints;

  // Create mutable copies of progress and earned
  const progressMap = createProgressMap(input.currentProgress);
  const earnedIds = new Set(input.earnedAchievementIds);

  for (const event of events) {
    const result = checkAchievements({
      ...input,
      eventType: event.eventType,
      eventData: event.eventData,
      currentProgress: Array.from(progressMap.entries()).map(([code, value]) => ({
        id: code,
        player_id: input.playerId,
        achievement_code: code,
        current_value: value,
        last_updated: new Date().toISOString(),
      })),
      earnedAchievementIds: Array.from(earnedIds),
      currentPoints: runningPoints,
    });

    // Merge progress updates
    for (const update of result.progressUpdates) {
      const existing = allProgressUpdates.get(update.achievement_code);
      if (existing) {
        existing.new_value = update.new_value;
      } else {
        allProgressUpdates.set(update.achievement_code, { ...update });
      }
      progressMap.set(update.achievement_code, update.new_value);
    }

    // Merge newly earned (avoid duplicates)
    for (const earned of result.newlyEarned) {
      if (!allNewlyEarned.has(earned.id)) {
        allNewlyEarned.set(earned.id, earned);
        earnedIds.add(earned.id);
        runningPoints += earned.points;
      }
    }
  }

  // Check final cosmetic unlocks
  const cosmeticUnlocks = checkCosmeticUnlocksFromPoints(
    runningPoints,
    input.cosmetics,
    input.unlockedCosmeticIds
  );

  return {
    progressUpdates: Array.from(allProgressUpdates.values()),
    newlyEarned: Array.from(allNewlyEarned.values()),
    cosmeticUnlocks,
  };
}
