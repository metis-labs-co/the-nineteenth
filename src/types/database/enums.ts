/**
 * Database Enum Types
 * All enum/union types used in the database schema
 */

// Competition enums
export type HandicapSystem = 'honor' | 'golf-australia' | 'gross-only';
export type HandicapSource = 'profile' | 'calculated' | 'none';
export type CompetitionVisibility = 'private' | 'public' | 'unlisted';
export type CompetitionStatus = 'upcoming' | 'in-progress' | 'completed' | 'cancelled';
export type CompetitionType = 'knockout' | 'event';

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
export type NewZealandRegion = 'Auckland' | 'Waikato' | 'Bay of Plenty' | 'Canterbury' | 'Wellington' | 'Otago';
export type UKRegion = 'England' | 'Scotland' | 'Wales' | 'Northern Ireland';
export type USState = 'CA' | 'FL' | 'TX' | 'AZ' | 'SC' | 'GA' | 'HI' | 'NC' | 'NV' | 'NY';
export type SupportedCountry = string;
export type RegionFilter = string;
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
  | 'social_round_invitation'
  | 'league_player_joined'
  | 'league_player_left'
  | 'league_player_removed'
  | 'league_round_tagged'
  | 'league_leaderboard_changed'
  | 'round_completed';

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
  | 'skins'
  | 'skins_game'
  | 'wolf_game'
  | 'prize_pool'
  | 'detailed_stats'
  | 'handicap_history'
  | 'achievement_leaderboard'
  | 'ai_competition'
  | 'manage_guests'
  | 'gps_distance';

// Knockout enums (re-exported from knockout.types.ts for consistency)
export type {
  BracketType,
  KnockoutMatchStatus,
  SeedingMethod,
} from './knockout.types';

// Skins enums (re-exported from skins.types.ts for consistency)
export type {
  SkinsPotType,
  SkinsScoringType,
  SkinsGameStatus,
  SkinsPoolSource,
} from './skins.types';
