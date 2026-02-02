// Tee transformation utilities
export { teeToTeeBox, teesToTeeBoxes } from './teeTransformers';

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

// Daily handicap calculation (GA 2025)
export {
  GA_HANDICAP_MULTIPLIER,
  GA_CONSISTENCY_FACTOR_MALE,
  GA_CONSISTENCY_FACTOR_FEMALE,
  getConsistencyFactor,
  calculateGADailyHandicap,
} from './dailyHandicap';

// Round leaderboard formatters
export {
  // Formatters
  formatStablefordData,
  formatStrokeData,
  formatMatchPlayData,
  formatTeamData,
  formatScoreData,
  transformToLeaderboardEntry,
  sortLeaderboardEntries,
  // Type guards
  isPlayerEntry,
  isTeamEntry,
  isStablefordScore,
  isStrokeScore,
  isMatchPlayScore,
  isTeamScore,
} from './roundLeaderboardFormatters';
export type {
  StablefordScoreData,
  StrokeScoreData,
  MatchPlayScoreData,
  TeamScoreData,
  FormatSpecificScoreData,
  PlayerLeaderboardEntry,
  TeamLeaderboardEntry,
  RoundLeaderboardEntry,
  PlayerInfo,
  TeamInfo,
  RoundResultRow,
} from './roundLeaderboardFormatters';

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

// GPS calculation utilities
export {
  // Constants
  EARTH_RADIUS_METERS,
  METERS_TO_YARDS,
  // Conversion functions
  toRadians,
  metersToYards,
  yardsToMeters,
  // Distance calculations
  calculateDistance,
  calculateCoordinateDistance,
  calculateDistanceToCoordinate,
  // Coordinate grouping
  groupCoordinatesByHole,
  getCoordinateByPoiType,
  getCoordinatesForHole,
} from './gpsCalculations';
export type { HoleCoordinatesByHole } from './gpsCalculations';

// Pairing algorithm utilities (snake draft, group management)
export {
  // Snake draft algorithm
  generateSnakeDraftPairings,
  // Tee time calculations
  calculateTeeTime,
  formatTeeTimeForDisplay,
  parseDisplayTimeToTeeTime,
  recalculateTeeTimes,
  // Group size calculations
  calculateRecommendedGroupCount,
  getOptimalGroupSizes,
  // Group management
  movePlayerToGroup,
  addPlayerToGroup,
  removePlayerFromGroups,
  addEmptyGroup,
  // Validation
  validatePairingGroups,
} from './pairingAlgorithm';
