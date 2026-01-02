/**
 * Cosmetic System Types
 * Types for the profile customization cosmetics feature
 * Cosmetics are unlockable rewards based on achievement points
 */

// =====================================================
// ENUMS
// =====================================================

/**
 * Types of cosmetics available
 * - badge: Displayed next to player name
 * - frame: Border/frame around player avatar
 * - title: Text displayed below player name
 */
export type CosmeticType = 'badge' | 'frame' | 'title';

// =====================================================
// DATABASE TYPES
// =====================================================

/**
 * Cosmetic definition from database
 * Master record defining a cosmetic reward
 */
export interface CosmeticDefinition {
  id: string;
  code: string;
  type: CosmeticType;
  name: string;
  description: string | null;
  icon: string | null;
  points_required: number;
  sort_order: number;
  created_at: string;
}

/**
 * Player cosmetic record from database
 * Tracks when a player unlocked a cosmetic
 */
export interface PlayerCosmetic {
  id: string;
  player_id: string;
  cosmetic_id: string;
  unlocked_at: string;
}

/**
 * Player cosmetic with joined cosmetic definition
 */
export interface PlayerCosmeticWithDefinition extends PlayerCosmetic {
  cosmetic?: CosmeticDefinition;
}

// =====================================================
// APP-LEVEL TYPES
// =====================================================

/**
 * Cosmetic with unlock and equipped status for display
 */
export interface CosmeticWithStatus extends CosmeticDefinition {
  is_unlocked: boolean;
  unlocked_at: string | null;
  is_equipped: boolean;
}

/**
 * Equipped cosmetics for a player
 * Used to display customized profile
 */
export interface EquippedCosmetics {
  badge: CosmeticDefinition | null;
  frame: CosmeticDefinition | null;
  title: CosmeticDefinition | null;
}

/**
 * Equipped cosmetics flattened for API response
 */
export interface EquippedCosmeticsFlat {
  badge_id: string | null;
  badge_code: string | null;
  badge_name: string | null;
  badge_icon: string | null;
  frame_id: string | null;
  frame_code: string | null;
  frame_name: string | null;
  frame_icon: string | null;
  title_id: string | null;
  title_code: string | null;
  title_name: string | null;
  title_icon: string | null;
}

/**
 * Player with equipped cosmetics
 */
export interface PlayerWithCosmetics {
  id: string;
  name: string;
  photo_url: string | null;
  equipped_badge_id: string | null;
  equipped_frame_id: string | null;
  equipped_title_id: string | null;
  equipped_cosmetics?: EquippedCosmetics;
}

/**
 * Cosmetics grouped by type for display
 */
export interface CosmeticsByType {
  badges: CosmeticWithStatus[];
  frames: CosmeticWithStatus[];
  titles: CosmeticWithStatus[];
}

/**
 * Summary of player's cosmetic progress
 */
export interface CosmeticProgress {
  total_points: number;
  unlocked_count: number;
  total_count: number;
  next_unlock: CosmeticDefinition | null;
  points_to_next: number;
}

// =====================================================
// INPUT TYPES
// =====================================================

/**
 * Input for equipping a cosmetic
 */
export interface EquipCosmeticInput {
  player_id: string;
  cosmetic_id: string;
}

/**
 * Input for unequipping a cosmetic
 */
export interface UnequipCosmeticInput {
  player_id: string;
  cosmetic_type: CosmeticType;
}

/**
 * Result from check_cosmetic_unlocks function
 */
export interface NewlyUnlockedCosmetic {
  cosmetic_id: string;
  code: string;
  name: string;
  type: CosmeticType;
  points_required: number;
}

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Display names for cosmetic types
 */
export const COSMETIC_TYPE_DISPLAY_NAMES: Record<CosmeticType, string> = {
  badge: 'Badges',
  frame: 'Frames',
  title: 'Titles',
};

/**
 * Icons for cosmetic types (Material icons)
 */
export const COSMETIC_TYPE_ICONS: Record<CosmeticType, string> = {
  badge: 'shield-star',
  frame: 'image-frame',
  title: 'format-title',
};

/**
 * Frame style definitions for rendering
 * Maps frame codes to visual styles
 */
export const FRAME_STYLES: Record<string, FrameStyle> = {
  FRAME_BRONZE: {
    borderColor: '#CD7F32',
    borderWidth: 3,
    gradient: ['#CD7F32', '#B87333'],
  },
  FRAME_SILVER: {
    borderColor: '#C0C0C0',
    borderWidth: 3,
    gradient: ['#E8E8E8', '#A8A8A8'],
  },
  FRAME_GOLD: {
    borderColor: '#FFD700',
    borderWidth: 4,
    gradient: ['#FFD700', '#FFA500'],
    glow: true,
  },
  FRAME_PLATINUM: {
    borderColor: '#E5E4E2',
    borderWidth: 4,
    gradient: ['#E5E4E2', '#D4D4D4', '#C0C0C0'],
    shimmer: true,
  },
  FRAME_DIAMOND: {
    borderColor: '#B9F2FF',
    borderWidth: 5,
    gradient: ['#B9F2FF', '#E0FFFF', '#87CEEB', '#B9F2FF'],
    animated: true,
  },
};

/**
 * Style definition for a frame cosmetic
 */
export interface FrameStyle {
  borderColor: string;
  borderWidth: number;
  gradient: string[];
  glow?: boolean;
  shimmer?: boolean;
  animated?: boolean;
}

/**
 * Badge style definitions for rendering
 * Maps badge codes to visual styles
 */
export const BADGE_STYLES: Record<string, BadgeStyle> = {
  BADGE_ROOKIE: {
    color: '#8B7355', // Bronze/brown
    icon: 'medal-outline',
    tier: 1,
  },
  BADGE_RISING_STAR: {
    color: '#4CAF50', // Green
    icon: 'star-rising',
    tier: 2,
  },
  BADGE_ACHIEVER: {
    color: '#2196F3', // Blue
    icon: 'shield-star',
    tier: 3,
  },
  BADGE_LEGEND: {
    color: '#9C27B0', // Purple
    icon: 'trophy-award',
    tier: 4,
    glow: true,
  },
  BADGE_CHAMPION: {
    color: '#FFD700', // Gold
    icon: 'crown',
    tier: 5,
    glow: true,
    animated: true,
  },
};

/**
 * Style definition for a badge cosmetic
 */
export interface BadgeStyle {
  color: string;
  icon: string;
  tier: number;
  glow?: boolean;
  animated?: boolean;
}

/**
 * Title style definitions for rendering
 * Maps title codes to visual styles
 */
export const TITLE_STYLES: Record<string, TitleStyle> = {
  TITLE_WEEKEND_WARRIOR: {
    displayText: 'Weekend Warrior',
    color: '#8B7355', // Bronze/brown
    tier: 1,
  },
  TITLE_COURSE_CONQUEROR: {
    displayText: 'Course Conqueror',
    color: '#4CAF50', // Green
    tier: 2,
  },
  TITLE_GOLF_LEGEND: {
    displayText: 'Golf Legend',
    color: '#2196F3', // Blue
    tier: 3,
  },
  TITLE_HALL_OF_FAMER: {
    displayText: 'Hall of Famer',
    color: '#9C27B0', // Purple
    tier: 4,
    glow: true,
  },
  TITLE_THE_GREATEST: {
    displayText: 'The Greatest',
    color: '#FFD700', // Gold
    tier: 5,
    glow: true,
    animated: true,
  },
};

/**
 * Style definition for a title cosmetic
 */
export interface TitleStyle {
  displayText: string;
  color: string;
  tier: number;
  glow?: boolean;
  animated?: boolean;
}

/**
 * Points required for each cosmetic
 * Useful for UI display and calculations
 */
export const COSMETIC_POINTS: Record<string, number> = {
  // Badges
  BADGE_ROOKIE: 100,
  BADGE_RISING_STAR: 750,
  BADGE_ACHIEVER: 1500,
  BADGE_LEGEND: 3000,
  BADGE_CHAMPION: 5000,
  // Frames
  FRAME_BRONZE: 250,
  FRAME_SILVER: 1000,
  FRAME_GOLD: 2000,
  FRAME_PLATINUM: 4000,
  FRAME_DIAMOND: 6000,
  // Titles
  TITLE_WEEKEND_WARRIOR: 500,
  TITLE_COURSE_CONQUEROR: 1500,
  TITLE_GOLF_LEGEND: 3000,
  TITLE_HALL_OF_FAMER: 5000,
  TITLE_THE_GREATEST: 10000,
};
