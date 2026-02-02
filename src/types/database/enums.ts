/**
 * Database Enum Types
 * All enum/union types used in the database schema
 */

// Competition enums
export type HandicapSystem = 'honor' | 'golf-australia' | 'gross-only';
export type CompetitionVisibility = 'private' | 'public' | 'unlisted';
export type CompetitionStatus = 'upcoming' | 'in-progress' | 'completed' | 'cancelled';
export type CompetitionType = 'league' | 'event';

// Game enums
export type GameType = 'stroke' | 'stableford' | 'par' | 'match-play' | 'best-ball' | 'scramble' | 'shamble';
export type RoundStatus = 'upcoming' | 'in-progress' | 'completed';

// Team enums
export type TeamMode = 'none' | 'fixed' | 'per-round';
export type TeamFormat = 'best-ball' | 'scramble' | 'aggregate' | 'match-play-team' | 'shamble';

// Player/Invitation enums
export type InvitationStatus = 'invited' | 'accepted' | 'declined';
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

// Scorecard enums
export type ScorecardStatus = 'not-started' | 'in-progress' | 'completed' | 'confirmed';

// Location enums
export type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';
export type CourseSource = 'api' | 'manual' | 'legacy';
export type PoiType = 'tee_front' | 'tee_back' | 'green_front' | 'green_center' | 'green_back';
export type MeasureUnit = 'm' | 'y'; // meters or yards

// Subscription enums
export type SubscriptionTier = 'free' | 'social' | 'premium' | 'super_admin';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';
export type SubscriptionSource = 'manual' | 'revenuecat' | 'stripe';

// Notification enums
export type NotificationType =
  | 'competition_player_added'
  | 'competition_player_joined'
  | 'new_round_created'
  | 'competition_status_changed'
  | 'scorecard_submitted'
  | 'friend_request_received'
  | 'friend_request_accepted'
  | 'social_round_invitation';

// Feature enums
export type TierFeature =
  | 'team_formats'
  | 'scoring_pairs'
  | 'export_data'
  | 'api_course_search'
  | 'basic_stats'
  | 'score_distribution'
  | 'advanced_stats'
  | 'compare_stats'
  | 'admin_tools'
  | 'skins';

// Skins enums (re-exported from skins.types.ts for consistency)
export type {
  SkinsPotType,
  SkinsScoringType,
  SkinsGameStatus,
  SkinsPoolSource,
} from './skins.types';
