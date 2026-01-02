// Formatting utilities
export * from './formatting';

// Scoring utilities
export * from './scoring';

// Competition points utilities
export * from './competitionPoints';

// Team scoring utilities (best ball, scramble, match play)
export * from './teamScoring';

// Team generation utilities (snake draft, team stats)
export * from './teamGeneration';

// Scoring pairs utilities (reciprocal, circular, cross-team)
export * from './scoringPairs';

// Scorecard calculation utilities
export * from './scorecardCalculations';

// Scorecard layout utilities
export * from './scorecardLayout';

// Display helper utilities
export * from './displayHelpers';

// Push notification test utilities (DEV only)
export { pushTestUtils } from './pushNotificationTest';
export type { TestResult, PushDebugInfo } from './pushNotificationTest';

// Achievement calculation utilities
export {
  calculateAchievementProgress,
  checkThresholdMet,
  getNextTierAchievement,
  calculateTotalPoints,
  groupAchievementsByCategory,
  getAchievementProgress,
  filterEarnableAchievements,
  calculateCompletionPercentage,
  checkCosmeticUnlocks,
  createProgressMap,
  sortByProgress,
  getNextAchievementInCategory,
} from './achievementCalculations';
export type { AchievementProgressResult, ProgressMap } from './achievementCalculations';
