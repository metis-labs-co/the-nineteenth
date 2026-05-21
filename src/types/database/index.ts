/**
 * Database Types - Barrel Export
 * Re-exports all database types from domain-specific files
 */

// Enums
export type {
  HandicapSystem,
  CompetitionVisibility,
  CompetitionStatus,
  CompetitionType,
  GameType,
  HandicapSource,
  RoundFormat,
  RoundStatus,
  SubMatchResult,
  SubMatchStatus,
  TeamMode,
  TeamFormat,
  TeamAggregationMethod,
  RoundTemplateId,
  QualifyingMetric,
  BracketSeedingStyle,
  InvitationStatus,
  FriendshipStatus,
  ScorecardStatus,
  AustralianState,
  NewZealandRegion,
  UKRegion,
  USState,
  SupportedCountry,
  RegionFilter,
  CourseSource,
  PoiType,
  MeasureUnit,
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionSource,
  NotificationType,
  TierFeature,
  BracketType,
  KnockoutMatchStatus,
  SeedingMethod,
} from './enums';

// Skins types
export type {
  // Enums
  SkinsPotType,
  SkinsScoringType,
  SkinsGameStatus,
  // Score data types
  SkinsHoleScoreData,
  SkinsHoleScores,
  SkinsTeamHoleScoreData,
  SkinsTeamHoleScores,
  // Game types
  SkinsGame,
  SkinsParticipant,
  SkinsTeamParticipant,
  SkinsGameWithParticipants,
  SkinsGameWithTeamParticipants,
  // Result types
  SkinsResult,
  SkinsWinner,
  SkinsTeamWinner,
  SkinsResultWithWinner,
  SkinsResultWithTeamWinner,
  // Payout types
  SkinsPayout,
  SkinsPayoutPlayer,
  SkinsPayoutTeam,
  SkinsPayoutWithPlayer,
  SkinsPayoutWithTeam,
  // Input types
  CreateSkinsGameInput,
  ProcessSkinsHoleInput,
  // Summary types
  SkinsGameSummary,
  SkinsConfig,
  SkinsDebtTransaction,
  SkinsTeamDebtTransaction,
  SkinsNetPosition,
  SkinsTeamNetPosition,
} from './skins.types';

// Wolf types
export type {
  // Enums
  WolfScoringType,
  WolfGameStatus,
  // Point values
  WolfPointValues,
  // Score data types
  WolfHoleScores,
  WolfPointsAwarded,
  // Game types
  WolfGame,
  WolfParticipant,
  WolfGameWithParticipants,
  // Decision types
  WolfHoleDecision,
  WolfDecisionWithDetails,
  // Payout types
  WolfPayout,
  WolfPayoutPlayer,
  WolfPayoutWithPlayer,
  // Input types
  CreateWolfGameInput,
  SubmitWolfDecisionInput,
  RecordWolfHoleResultInput,
  // Config and result types
  WolfConfig,
  WolfHoleResult,
  WolfStandingEntry,
  WolfDebtTransaction,
  // Summary types
  WolfGameSummary,
} from './wolf.types';
export { WOLF_POINTS } from './wolf.types';

// Prize Pool types
export type {
  PoolFundingType,
  PoolStatus,
  PoolTargetType,
  PoolTransactionType,
  CompetitionPrizePool,
  PrizePoolPlacement,
  PoolTransaction,
  CreatePrizePoolInput,
  UpdatePrizePoolInput,
  PlacementInput,
  PrizePoolWithPlacements,
} from './prizePool.types';

// Base types
export type { GeoPoint, Hole, TeeBox, HoleScore, MultiBallHoleScore, BallTotals, HoleShotContributions } from './base';
export { isMultiBallScore, isSingleBallScore } from './base';

// Player types
export type {
  Player,
  PushPreferences,
  UserPreferences,
  Friendship,
  Friend,
  FriendRequest,
  PlayerSearchResult,
  // Placeholder player types
  PlaceholderPlayerInput,
  PlaceholderPlayerWithStats,
  LinkablePlayer,
  LinkPlaceholderResult,
} from './player.types';
export { isPlaceholderPlayer, isLinkedPlaceholder, isRealPlayer } from './player.types';

// Competition types
export type {
  PointSystemConfig,
  Competition,
  CompetitionPlayer,
  IndividualStandingsEntry,
} from './competition.types';
export { DEFAULT_POINT_SYSTEM } from './competition.types';

// Course types (updated for GolfAPI.io integration - January 2026)
export type {
  // Primary types
  Club,
  Course,
  Tee,
  HoleCoordinate,
  FavoriteCourse,
  // Composite types
  ClubWithCourses,
  CourseWithClub,
  CourseWithTees,
  CourseWithCoordinates,
  CourseWithFullData,
  // Deprecated aliases (for backwards compatibility)
  Venue,
  LegacyCourse,
} from './course.types';
export { getTeeHoleLength, getTeeHoleLengths } from './course.types';

// Round types
export type {
  Round,
  Pairing,
  RoundPlayer,
  RoundPlayerWithPlayer,
  SubMatch,
} from './round.types';

// Round rules override
export type {
  RoundRulesOverride,
  WinTieLossPoints,
  TeamAggregationConfig,
} from './roundRules.types';
export { isRoundRulesOverride } from './roundRules.types';

// Scorecard types
export type {
  Scorecard,
  LeaderboardEntry,
  ScoringPair,
  ScoringPairWithPlayers,
  ScoringPairInput,
  ScoringPairsValidation,
  ShotContributions,
} from './scorecard.types';

// Team types
export type {
  Team,
  TeamMember,
  TeamWithMembers,
  TeamStandingsEntry,
  RoundResult,
  RoundResultData,
  MatchPlayHoleResult,
} from './team.types';

// Notification types
export type {
  NotificationData,
  Notification,
  NotificationWithRelations,
} from './notification.types';

// Subscription types
export type { UserSubscription, TierLimits } from './subscription.types';

// Push token types
export type { PushToken } from './push-token.types';

// Achievement types
export type {
  AchievementCategory,
  AchievementRarity,
  AchievementDefinition,
  PlayerAchievement,
  PlayerAchievementWithDefinition,
  AchievementProgress,
  AchievementWithProgress,
  AchievementSummary,
  RecentAchievement,
  CategoryProgress,
  AchievementLeaderboardEntry,
  AchievementLeaderboardScope,
  AchievementEventType,
  AchievementEventData,
  AchievementCheckEvent,
  AchievementCheckResult,
  AchievementProgressUpdate,
  AwardAchievementInput,
  UpdateProgressInput,
} from './achievement.types';
export {
  RARITY_POINTS,
  RARITY_COLORS,
  CATEGORY_DISPLAY_NAMES,
  CATEGORY_ICONS,
} from './achievement.types';

// Cosmetic types
export type {
  CosmeticType,
  CosmeticDefinition,
  PlayerCosmetic,
  PlayerCosmeticWithDefinition,
  CosmeticWithStatus,
  EquippedCosmetics,
  EquippedCosmeticsFlat,
  PlayerWithCosmetics,
  CosmeticsByType,
  CosmeticProgress,
  EquipCosmeticInput,
  UnequipCosmeticInput,
  NewlyUnlockedCosmetic,
  FrameStyle,
} from './cosmetic.types';
export {
  COSMETIC_TYPE_DISPLAY_NAMES,
  COSMETIC_TYPE_ICONS,
  FRAME_STYLES,
} from './cosmetic.types';

// Knockout types
export type {
  KnockoutConfig,
  ValidPlayerCount,
  KnockoutMatch,
  KnockoutMatchWithPlayers,
  BracketStage,
  BracketData,
} from './knockout.types';

// League types
export type {
  LeagueStatus,
  LeagueType,
  LeaguePlayerStatus,
  LadderChallengeStatus,
  LadderSeeding,
  EclecticScoring,
  LeagueSortMode,
  League,
  LeaguePlayer,
  LeagueRound,
  LeagueLeaderboardEntry,
  LeagueRoundDetail,
  LeagueWithPlayerCount,
  LeagueWithUserRank,
  LadderChallenge,
  LadderStandingsEntry,
  LadderChallengeWithPlayers,
  EclecticBestScore,
  EclecticLeaderboardEntry,
  LeagueStatsResponse,
  PartnershipFormat,
  DifficultyLevel,
  PartnershipStatus,
  LeaguePartnership,
  PartnershipRound,
  PartnershipLeaderboardEntry,
  PartnershipCourseBest,
} from './league.types';

// Schema type
export type { Database } from './schema';

// Helper types
export type { TableName, TableRow, TableInsert, TableUpdate } from './helpers';
