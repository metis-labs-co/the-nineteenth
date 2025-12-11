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
  RoundStatus,
  TeamMode,
  TeamFormat,
  InvitationStatus,
  FriendshipStatus,
  ScorecardStatus,
  AustralianState,
  CourseSource,
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionSource,
  NotificationType,
  TierFeature,
} from './enums';

// Base types
export type { GeoPoint, Hole, TeeBox, HoleScore } from './base';

// Player types
export type {
  Player,
  Friendship,
  Friend,
  FriendRequest,
  PlayerSearchResult,
} from './player.types';

// Competition types
export type {
  PointSystemConfig,
  Competition,
  CompetitionPlayer,
  IndividualStandingsEntry,
} from './competition.types';
export { DEFAULT_POINT_SYSTEM } from './competition.types';

// Course types
export type {
  Venue,
  Course,
  CourseWithVenue,
  LegacyCourse,
  FavoriteCourse,
} from './course.types';

// Round types
export type {
  Round,
  Pairing,
  RoundPlayer,
  RoundPlayerWithPlayer,
} from './round.types';

// Scorecard types
export type {
  Scorecard,
  LeaderboardEntry,
  ScoringPair,
  ScoringPairWithPlayers,
  ScoringPairInput,
  ScoringPairsValidation,
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

// Schema type
export type { Database } from './schema';

// Helper types
export type { TableName, TableRow, TableInsert, TableUpdate } from './helpers';
