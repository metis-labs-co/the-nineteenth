/**
 * Achievement System Types
 * Types for the gamification/achievements feature
 */

// =====================================================
// ENUMS
// =====================================================

/**
 * Achievement categories for filtering and organization
 */
export type AchievementCategory =
  | 'rounds'
  | 'game_types'
  | 'scoring'
  | 'competitions'
  | 'social'
  | 'courses'
  | 'match_play'
  | 'streaks'
  | 'milestones';

/**
 * Achievement rarity levels
 * Determines points awarded and display styling
 */
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// =====================================================
// DATABASE TYPES
// =====================================================

/**
 * Achievement definition from database
 * Master record defining an achievement
 */
export interface AchievementDefinition {
  id: string;
  code: string;
  category: AchievementCategory;
  name: string;
  description: string;
  icon: string;
  tier: number;
  threshold: number;
  base_achievement: string | null;
  points: number;
  rarity: AchievementRarity;
  is_hidden: boolean;
  created_at: string;
}

/**
 * Player achievement record from database
 * Tracks when a player earned an achievement
 */
export interface PlayerAchievement {
  id: string;
  player_id: string;
  achievement_id: string;
  earned_at: string;
  progress: number;
  notified: boolean;
}

/**
 * Player achievement with joined achievement definition
 */
export interface PlayerAchievementWithDefinition extends PlayerAchievement {
  achievement?: AchievementDefinition;
}

/**
 * Achievement progress record from database
 * Tracks current progress toward achievements
 */
export interface AchievementProgress {
  id: string;
  player_id: string;
  achievement_code: string;
  current_value: number;
  last_updated: string;
}

// =====================================================
// APP-LEVEL TYPES
// =====================================================

/**
 * Achievement with progress for display
 * Combines definition with player-specific progress
 */
export interface AchievementWithProgress extends AchievementDefinition {
  earned: boolean;
  earned_at: string | null;
  current_progress: number;
  next_tier: AchievementDefinition | null;
}

/**
 * Summary of a player's achievements
 */
export interface AchievementSummary {
  total_earned: number;
  total_available: number;
  total_points: number;
  completion_percentage: number;
  recent_achievements: RecentAchievement[];
  by_category: Record<AchievementCategory, CategoryProgress>;
}

/**
 * Recent achievement for summary display
 */
export interface RecentAchievement {
  achievement_id: string;
  name: string;
  icon: string;
  earned_at: string;
  points: number;
}

/**
 * Progress by category
 */
export interface CategoryProgress {
  earned: number;
  total: number;
}

/**
 * Achievement leaderboard entry
 */
export interface AchievementLeaderboardEntry {
  rank: number;
  player_id: string;
  name: string;
  photo_url: string | null;
  total_points: number;
  achievements_earned: number;
  last_achievement_at: string | null;
}

/**
 * Leaderboard scope options
 */
export type AchievementLeaderboardScope = 'global' | 'friends' | 'competition';

// =====================================================
// EVENT TYPES (for achievement checking)
// =====================================================

/**
 * Event types that can trigger achievement checks
 */
export type AchievementEventType =
  | 'round_completed'
  | 'scorecard_submitted'
  | 'competition_joined'
  | 'competition_won'
  | 'competition_podium'
  | 'friend_added'
  | 'course_played'
  | 'home_venue_played'
  | 'birdie_recorded'
  | 'eagle_recorded'
  | 'albatross_recorded'
  | 'ace_recorded'
  | 'par_recorded'
  | 'competition_created'
  | 'match_play_won'
  | 'stableford_round';

/**
 * Achievement event data
 */
export interface AchievementEventData {
  // Round events
  round_id?: string;
  game_type?: string;
  course_id?: string;
  is_competition?: boolean;
  is_home_venue?: boolean;
  hole_count?: number;

  // Scoring events - counts from a scorecard
  birdies?: number;
  eagles?: number;
  pars?: number;
  bogeys?: number;
  double_bogeys?: number;
  hole_in_one?: boolean;

  // Scoring events - single score type
  score_type?: 'birdie' | 'eagle' | 'albatross' | 'ace' | 'par';
  stableford_points?: number;
  gross_score?: number;
  net_score?: number;

  // Competition events
  competition_id?: string;
  competition_count?: number;
  position?: number;

  // Social events
  friend_count?: number;
  unique_players_count?: number;

  // Match play events
  match_result?: 'win' | 'loss' | 'halve';
  margin?: string; // e.g., '5&4', '2&1'
}

/**
 * Achievement check event
 */
export interface AchievementCheckEvent {
  event_type: AchievementEventType;
  player_id: string;
  data: AchievementEventData;
  timestamp?: string;
}

/**
 * Result of checking achievements
 */
export interface AchievementCheckResult {
  progress_updates: AchievementProgressUpdate[];
  newly_earned: AchievementDefinition[];
}

/**
 * Progress update from achievement check
 */
export interface AchievementProgressUpdate {
  achievement_code: string;
  new_value: number;
  previous_value: number;
}

// =====================================================
// INPUT TYPES
// =====================================================

/**
 * Input for awarding an achievement
 */
export interface AwardAchievementInput {
  player_id: string;
  achievement_id: string;
  progress?: number;
}

/**
 * Input for updating achievement progress
 */
export interface UpdateProgressInput {
  player_id: string;
  achievement_code: string;
  value: number;
  increment?: boolean; // If true, adds to current value instead of replacing
}

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Points awarded by rarity
 */
export const RARITY_POINTS: Record<AchievementRarity, number> = {
  common: 10,
  uncommon: 20,
  rare: 50,
  epic: 100,
  legendary: 250,
};

/**
 * Display colors by rarity (for UI styling)
 */
export const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: '#9CA3AF', // gray-400
  uncommon: '#22C55E', // green-500
  rare: '#3B82F6', // blue-500
  epic: '#A855F7', // purple-500
  legendary: '#F59E0B', // amber-500
};

/**
 * Category display names
 */
export const CATEGORY_DISPLAY_NAMES: Record<AchievementCategory, string> = {
  rounds: 'Rounds',
  game_types: 'Game Types',
  scoring: 'Scoring',
  competitions: 'Competitions',
  social: 'Social',
  courses: 'Courses',
  match_play: 'Match Play',
  streaks: 'Streaks',
  milestones: 'Milestones',
};

/**
 * Category icons (Material icons)
 */
export const CATEGORY_ICONS: Record<AchievementCategory, string> = {
  rounds: 'golf',
  game_types: 'gamepad-variant',
  scoring: 'target',
  competitions: 'trophy',
  social: 'account-group',
  courses: 'map-marker',
  match_play: 'sword-cross',
  streaks: 'fire',
  milestones: 'star',
};
