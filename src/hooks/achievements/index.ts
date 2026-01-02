/**
 * Achievements Hooks Module
 *
 * Re-exports all achievement-related TanStack Query hooks.
 */

// Query hooks
export {
  useAchievementDefinitions,
  usePlayerAchievements,
  useAchievementProgress,
  useAchievementSummary,
  useAchievementLeaderboard,
} from './useAchievements';

// Mutation hooks
export { useAwardAchievement, useUpdateProgress } from './useAchievements';

// Convenience hooks
export {
  useHasAchievement,
  useAchievementPoints,
  useAchievementsByCategory,
} from './useAchievements';

// Achievement checking hooks
export {
  useCheckAchievements,
  useCheckMultipleAchievements,
  useCheckAchievementForEvent,
} from './useCheckAchievements';

// Types
export type {
  CheckAndAwardInput,
  CheckAndAwardResult,
  UseCheckAchievementsReturn,
} from './useCheckAchievements';
