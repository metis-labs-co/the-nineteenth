/**
 * Core type definitions for FairwayMate
 *
 * This file contains:
 * - Re-exported enums from database.types.ts (single source of truth)
 * - App-specific interfaces using camelCase conventions
 * - Form types and API response wrappers
 */

// Import enums for internal use in this file
import type {
  AustralianState as DBStateType,
  GameType as DBGameType,
  HandicapSystem as DBHandicapSystem,
  CompetitionVisibility as DBVisibility,
  CompetitionStatus as DBCompStatus,
  RoundStatus as DBRoundStatus,
  ScorecardStatus as DBScorecardStatus,
  InvitationStatus as DBInviteStatus,
  // Import for internal use in this file
  Hole,
  TeeBox,
  HoleScore,
  MultiBallHoleScore,
} from './database.types';

// Re-export enums from database.types.ts (single source of truth for enum values)
// Note: SubscriptionTier, SubscriptionStatus, SubscriptionSource are exported from subscription.types.ts
export type {
  AustralianState,
  GameType,
  HandicapSystem,
  CompetitionVisibility,
  CompetitionStatus,
  RoundStatus,
  ScorecardStatus,
  InvitationStatus,
  CourseSource,
  NotificationType,
} from './database.types';

// Re-export notification types
export type { Notification, NotificationData, NotificationWithRelations } from './database.types';

// Re-export push notification types
export type {
  DBPushToken,
  PushToken,
  PushPreferences,
  PushNotificationData,
  ExpoPushMessage,
  ExpoPushTicket,
  ExpoPushReceipt,
  PushTokenInput,
} from './push.types';

export {
  DEFAULT_PUSH_PREFERENCES,
  mapDBPushToken,
  mapPushTokenToDB,
  isValidExpoPushToken,
  getEnabledNotificationTypes,
  shouldSendNotification,
} from './push.types';

// Re-export subscription types from dedicated file (app-level camelCase types)
export type {
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionSource,
  FeatureId,
  UserSubscription,
  TierLimits,
  FeatureAccess,
  IsSuperAdmin,
} from './subscription.types';

export {
  UNLIMITED,
  NO_LIMIT,
  TIER_HIERARCHY,
  isSubscriptionTier,
  isSubscriptionStatus,
  isSubscriptionSource,
  isFeatureId,
  isUnlimited,
  isNoLimit,
  hasTierOrHigher,
  getNextTier,
  mapDBUserSubscription,
  mapDBTierLimits,
} from './subscription.types';

// Re-export TierFeature from database.types (for DB function compatibility)
export type { TierFeature } from './database.types';

// Re-export handicap types (daily handicap + social handicap index)
export type {
  DailyHandicapParams,
  DailyHandicapResult,
  ScoreDifferentialParams,
  HandicapRound,
  HandicapSummary,
} from './handicap.types';

// Re-export pairing types (player groupings with tee times)
export type {
  TeeTimeSlotConfig,
  PairingGroup,
  PairingFormData,
  PairingWithPlayers,
  PairingPlayer,
  GeneratePairingsOptions,
  GeneratePairingsResult,
  CreatePairingsInput,
  UpdatePairingInput,
  TeeTimeInterval,
} from './pairing.types';

export {
  toPairingPlayer,
  DEFAULT_TEE_TIME_CONFIG,
  TEE_TIME_INTERVALS,
} from './pairing.types';

// Re-export player gender type
export type { PlayerGender } from './database/player.types';

// Re-export nested types from database.types.ts (single source of truth)
// These are used in JSONB fields and should be consistent across app
export type {
  Hole,
  TeeBox,
  HoleScore,
  MultiBallHoleScore,
  BallTotals,
  HoleShotContributions,
  // Also export DB versions of entities used in tests
  Player as DBPlayer,
  Scorecard as DBScorecard,
  Competition as DBCompetition,
  Round as DBRound,
  // Team types
  Team,
  TeamMember,
  TeamWithMembers,
  // Scoring pair types
  ScoringPairWithPlayers,
  // Shot contribution types for scramble
  ShotContributions,
  // Skins types
  SkinsConfig,
  SkinsPoolSource,
  SkinsPoolSourceConfig,
  // Wolf types
  WolfConfig,
  WolfScoringType,
  WolfGameStatus,
  WolfGame,
  WolfHoleDecision,
  WolfPayout,
  WolfGameWithParticipants,
  WolfDecisionWithDetails,
  WolfPayoutWithPlayer,
  CreateWolfGameInput,
  SubmitWolfDecisionInput,
  RecordWolfHoleResultInput,
  WolfStandingEntry,
  WolfGameSummary,
  // Prize Pool types
  PoolFundingType,
  PoolStatus,
  PoolTransactionType,
  CompetitionPrizePool,
  PoolTransaction,
  CreatePrizePoolInput,
  UpdatePrizePoolInput,
  PoolAllocationDetail,
  PoolAllocationSummary,
  PoolBalanceSummary,
  PrizePoolWithSummary,
} from './database.types';

// App-specific type (not in database schema)
export type CompetitionType = 'knockout' | 'event';

// Internal type aliases for use in this file
type AustralianState = DBStateType;
type GameType = DBGameType;
type HandicapSystem = DBHandicapSystem;
type CompetitionVisibility = DBVisibility;
type CompetitionStatus = DBCompStatus;
type RoundStatus = DBRoundStatus;
type ScorecardStatus = DBScorecardStatus;
type InvitationStatus = DBInviteStatus;

// Team modes (matches database.types.ts)
export type TeamMode = 'none' | 'fixed' | 'per-round';

// Point system entry
export interface PointSystemEntry {
  position: number;
  points: number;
}

// Competition
export interface Competition {
  id: string;
  name: string;
  description?: string;
  competitionType: CompetitionType;
  startDate: Date;
  endDate?: Date; // Required for 'event' type, optional for 'knockout'
  handicapSystem: HandicapSystem;
  visibility: CompetitionVisibility;
  inviteCode: string;
  organizerId: string;
  status: CompetitionStatus;
  // Team settings
  teamMode?: TeamMode;
  teamSize?: number;
  pointSystem?: PointSystemEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CompetitionCreateInput {
  name: string;
  description?: string;
  competitionType?: CompetitionType; // Optional - defaults to 'event'
  startDate: Date;
  endDate?: Date; // Required if competitionType is 'event'
  handicapSystem: HandicapSystem;
  visibility?: CompetitionVisibility;
  inviteCode?: string; // Optional - auto-generated if not provided
  // Team settings
  teamMode?: TeamMode;
  teamSize?: number;
  pointSystem?: PointSystemEntry[];
}

// Round
export interface Round {
  id: string;
  competitionId: string;
  roundNumber: number;
  courseId: string;
  course?: Course;
  date?: Date;
  teeTime?: string;
  gameType: GameType;
  status: RoundStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoundCreateInput {
  competitionId: string;
  roundNumber: number;
  courseId: string;
  date?: Date;
  teeTime?: string;
  gameType: GameType;
}

// Course
export interface Course {
  id: string;
  source: 'api' | 'manual';
  apiId?: string;
  
  // Basic Info
  name: string;
  state: AustralianState;
  city: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude: number;
  longitude: number;
  
  // Course Details
  holes: Hole[];
  tees?: TeeBox[];
  slopeRating?: number;
  courseRating?: number;
  
  // Metadata
  lastSynced?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Hole, TeeBox, and HoleScore are re-exported from database.types.ts above

export interface CourseSearchParams {
  name?: string;
  state?: AustralianState;
  city?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // in km
}

// Player
export interface Player {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  handicap?: number | null; // GA Handicap (profile), nullable to match database type
  handicapIndex?: number | null; // Social Handicap Index (calculated from app rounds)
  gender?: 'male' | 'female' | null; // For GA Daily Handicap consistency factor
  photoUrl?: string | null;
  // Optional since most components don't need these
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface PlayerCreateInput {
  id?: string; // UUID if existing player (e.g., friend with account)
  name: string;
  email: string;
  phone?: string;
  handicap?: number;
}

// Competition Player (join table)
export interface CompetitionPlayer {
  competitionId: string;
  playerId: string;
  player?: Player;
  status: InvitationStatus;
  invitedAt: Date;
  respondedAt?: Date;
}

// Pairing
export interface Pairing {
  id: string;
  roundId: string;
  playerIds: string[];
  players?: Player[];
  teeTime?: string;
  createdAt: Date;
}

export interface PairingCreateInput {
  roundId: string;
  playerIds: string[];
  teeTime?: string;
}

// Scorecard
export interface Scorecard {
  id: string;
  roundId: string;
  playerId: string;
  player?: Player;
  /** Hole scores indexed by hole number. Supports both single-ball and multi-ball scores */
  scores: { [holeNumber: number]: HoleScore | MultiBallHoleScore };
  totalGross: number;
  totalNet: number;
  status: ScorecardStatus;
  submittedAt?: Date;
  submittedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  /** True if this is a standalone/local round that shouldn't sync to server */
  isStandalone?: boolean;

  // Sync metadata for handicap differential calculation (attached before sync)
  /** Selected tee with course/slope ratings - attached for handicap calculation */
  teeData?: TeeBox | null;
  /** Player gender for selecting appropriate tee ratings */
  playerGender?: 'male' | 'female' | null;
  /** Player's GA handicap at time of round */
  playerHandicap?: number | null;
  /** Course par (sum of hole pars) */
  coursePar?: number;
}

// HoleScore is re-exported from database.types.ts above

export interface ScorecardUpdateInput {
  scores: { [holeNumber: number]: HoleScore | MultiBallHoleScore };
  status?: ScorecardStatus;
}

// Leaderboard
export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  handicap: number | null;
  position: number;
  totalGross: number;
  totalNet: number;
  roundsPlayed: number;
  lastRoundScore?: number;
  scorecards?: Scorecard[];
}

// API Response wrappers
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Offline sync - data can be any entity type being synced
// Using a flexible type since sync data is serialized and cast to specific types at usage
export interface PendingSync {
  id?: number;
  type: 'scorecard' | 'competition' | 'round' | 'player';
  action: 'create' | 'update' | 'delete';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  timestamp: Date;
  retryCount: number;
}

// Form types (for react-hook-form)
export interface CompetitionFormData {
  name: string;
  description: string;
  competitionType: CompetitionType;
  startDate: string;
  endDate?: string; // Required if competitionType is 'event'
  handicapSystem: HandicapSystem;
  visibility: CompetitionVisibility;
}

export interface RoundFormData {
  courseId: string;
  courseName: string;
  date: string;
  teeTime: string;
  gameType: GameType;
}

export interface PlayerFormData {
  name: string;
  email: string;
  phone: string;
  handicap: string;
}

export interface ScorecardFormData {
  [key: string]: string | number; // Dynamic keys for hole scores
}

// =====================================================
// SCORING PAIRS
// =====================================================

/**
 * App-level scoring pair type (camelCase)
 * Represents a relationship where one player (scorer/marker)
 * is responsible for recording another player's score.
 */
export interface ScoringPair {
  id: string;
  roundId: string;
  scorerId: string; // The marker/scorer
  playerId: string; // The player being scored
  scorer?: Player;
  player?: Player;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a scoring pair
 */
export interface ScoringPairCreateInput {
  scorerId: string;
  playerId: string;
}

/**
 * Result of auto-pairing algorithm
 */
export interface AutoPairResult {
  pairs: ScoringPairCreateInput[];
  type: 'reciprocal' | 'circular';
}