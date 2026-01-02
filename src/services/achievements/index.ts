/**
 * Achievement Services
 *
 * Export all achievement-related services
 */

export {
  checkAchievements,
  checkAchievementsBatch,
  getRelevantAchievements,
  getProgressIncrement,
  calculateNewProgress,
  EVENT_CATEGORY_MAP,
  EVENT_ACHIEVEMENT_MAP,
} from './achievementChecker';

export type {
  AchievementCheckResult,
  CheckAchievementsInput,
} from './achievementChecker';
