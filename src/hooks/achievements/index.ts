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
  useAchievementsByCategory,
} from './queries';

// Mutation hooks
export { useAwardAchievement, useUpdateProgress } from './mutations';

// Convenience hooks
export {
  useHasAchievement,
  useAchievementPoints,
} from './utilities';

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
