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

// App Store utilities
export { openAppStoreSubscriptionSettings } from './appStore';

// Skins calculation utilities
export {
  // Pot calculations
  calculateHoleValue,
  calculateTotalPot,
  calculateBuyIn,
  // Score preparation
  prepareHoleScores,
  // Winner determination
  determineHoleWinner,
  // Carryover calculations
  calculateCurrentCarryover,
  // Hole result processing
  processHoleResult,
  // Hole 18 split
  calculateHole18Split,
  // Final payouts
  calculateFinalPayouts,
  calculateFinalPayoutsWithCarryover,
  // Validation
  validateSkinsGame,
  validateHoleScores,
  // Debt calculations
  calculateNetPositions,
  simplifyDebts,
  formatDebtTransactions,
  // Utility functions
  isSkinsGameComplete,
  getNextHoleNumber,
} from './skinsCalculations';
export type {
  SkinsParticipantInfo,
  SkinsScorecardData,
  HoleWinnerResult,
  ProcessedHoleResult,
  PayoutParticipant,
  CalculatedPayout,
  FinalPayoutResult,
  FinalPayoutOptions,
  ValidationResult,
  HoleScoresValidationResult,
  PlayerNameMap,
} from './skinsCalculations';
