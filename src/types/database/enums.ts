/**
 * Database Enum Types
 * All enum/union types used in the database schema
 */

// Competition enums
export type HandicapSystem = 'honor' | 'whs' | 'gross-only';
export type HandicapSource = 'profile' | 'calculated' | 'none';

/**
 * Which holes to play in a round
 * 'full' = all 18, 'front9' = holes 1-9, 'back9' = holes 10-18
 */
export type NineType = 'full' | 'front9' | 'back9';

export type CompetitionVisibility = 'private' | 'public' | 'unlisted';
export type CompetitionStatus = 'upcoming' | 'in-progress' | 'completed' | 'cancelled';
export type CompetitionType = 'knockout' | 'event';

// Game enums
export type GameType = 'stroke' | 'stableford' | 'par' | 'match-play' | 'best-ball' | 'scramble' | 'shamble';
export type RoundStatus = 'upcoming' | 'in-progress' | 'completed';

/**
 * How team-round scoring is aggregated.
 * - 'combined' — one team match using best-ball across all team members (legacy).
 * - 'split'    — independent head-to-head sub-matches aggregated Ryder-Cup style.
 */
export type RoundFormat = 'combined' | 'split';

/** Status lifecycle for an individual sub-match within a split round. */
export type SubMatchStatus = 'upcoming' | 'in-progress' | 'completed' | 'forfeited';

/** Final result of a sub-match (null until completed). */
export type SubMatchResult =
  | 'a-wins'
  | 'b-wins'
  | 'halved'
  | 'forfeit-a'
  | 'forfeit-b';

// Team enums
export type TeamMode = 'none' | 'fixed' | 'per-round';
export type TeamFormat = 'best-ball' | 'scramble' | 'aggregate' | 'match-play-team' | 'shamble';

/**
 * How individual scores combine into a team score for per-round rule overrides.
 * - 'best_n_of_m'       — sum the best N individual scores (e.g. best 3 of 4 Stableford).
 * - 'sum'               — sum every team member's score (same as existing 'aggregate').
 * - 'best_ball'         — best member score per hole (same as existing best-ball team_format).
 * - 'pairs_better_ball' — better ball within each sub-match pair (round_format='split').
 * - 'scramble'          — team scramble (uses existing scramble team handicap).
 */
export type TeamAggregationMethod =
  | 'best_n_of_m'
  | 'sum'
  | 'best_ball'
  | 'pairs_better_ball'
  | 'scramble';

/** Built-in round rule templates. Resolved to concrete overrides in src/constants/roundTemplates.ts. */
export type RoundTemplateId =
  | 'team_stableford_best_n_of_m'
  | 'pairs_better_ball'
  | 'pairs_scramble'
  | 'team_scramble_fixed_points'
  | 'qualifying_match_play';

/** Metric used to rank qualifying-round participants when auto-seeding a knockout bracket. */
export type QualifyingMetric =
  | 'stableford_points'
  | 'net_strokes'
  | 'competition_points';

/**
 * Bracket seeding style for knockout generation.
 * - 'standard' — (1,N), (2,N-1), … — top seed rewarded (classic).
 * - 'adjacent' — (1,2), (3,4), … — closely-matched social format.
 */
export type BracketSeedingStyle = 'standard' | 'adjacent';

/**
 * How player pairings are generated for a round.
 * - 'manual'             — organiser sets pairings by hand (default).
 * - 'current_standings'  — auto-generate 1v1 pairings from the cumulative
 *                          individual leaderboard of completed prior rounds
 *                          in the competition. Used by 1v1 match-play presets.
 */
export type PairingSource = 'manual' | 'current_standings';

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
export type SubscriptionTier =
  | 'free'
  | 'social'
  | 'premium'
  | 'enterprise'
  | 'super_admin'
  | 'developer';
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
  | 'partnership_created'
  | 'partnership_round_tagged'
  | 'round_completed'
  | 'skins_game_completed'
  | 'skins_game_cancelled'
  | 'wolf_game_completed'
  | 'wolf_game_cancelled'
  | 'prize_pool_settled'
  | 'tee_time_reminder';

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
  | 'gps_distance'
  | 'beta_features'
  | 'advanced_round_rules';

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
} from './skins.types';
