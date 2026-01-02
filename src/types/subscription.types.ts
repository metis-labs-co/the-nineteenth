/**
 * Subscription Types for The Nineteenth
 *
 * App-level TypeScript types for subscription tiers, feature gating, and access control.
 * Uses camelCase naming conventions for frontend consistency.
 *
 * Database types are in database.types.ts (snake_case).
 * This file provides app-friendly interfaces for working with subscriptions.
 */

import type { GameType } from './database.types';

// =====================================================
// MAPPER FUNCTIONS (DB <-> App)
// =====================================================

import type {
  UserSubscription as DBUserSubscription,
  TierLimits as DBTierLimits,
} from './database.types';

// Re-export GameType for convenience when working with subscription features
export type { GameType };

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Special value indicating unlimited (no limit enforced)
 * Use for limit comparisons: if (limit === UNLIMITED) { allow }
 */
export const UNLIMITED = -1;

/**
 * Special value indicating no system limit (bypass all checks)
 * Used exclusively for super_admin tier
 */
export const NO_LIMIT = -2;

// =====================================================
// ENUMS / UNION TYPES
// =====================================================

/**
 * Subscription tier levels
 * - free: Basic access, limited features
 * - social: Casual players, social rounds
 * - premium: Full feature access
 * - super_admin: Unrestricted system access
 */
export type SubscriptionTier = 'free' | 'social' | 'premium' | 'super_admin';

/**
 * Subscription status values
 * - active: Currently valid subscription
 * - cancelled: User cancelled but may still be valid until expires_at
 * - expired: Past expiration date
 * - trial: Free trial period
 */
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';

/**
 * Source of the subscription
 * - manual: Admin-assigned or promotional
 * - revenuecat: RevenueCat in-app purchase
 * - stripe: Stripe payment integration
 */
export type SubscriptionSource = 'manual' | 'revenuecat' | 'stripe';

/**
 * Feature identifiers for tier-gated functionality
 * Used for feature flag checks and access control
 */
export type FeatureId =
  // Competition features
  | 'create_competition'
  | 'add_round'
  | 'add_player'
  | 'game_type'
  | 'team_formats'
  | 'scoring_pairs'
  // Social features
  | 'add_friend'
  | 'compare_stats'
  // Statistics features
  | 'basic_stats'
  | 'score_distribution'
  | 'advanced_stats'
  | 'fir_gir_tracking'
  | 'export_data'
  // Admin features
  | 'admin_tools';

// =====================================================
// INTERFACES
// =====================================================

/**
 * User subscription record (app-level, camelCase)
 * Represents a user's current subscription state
 */
export interface UserSubscription {
  id: string;
  userId: string;

  // Subscription details
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  source: SubscriptionSource;

  // External payment provider IDs
  externalId: string | null;
  productId: string | null;

  // Subscription dates (as Date objects for app use)
  startedAt: Date;
  expiresAt: Date | null;
  cancelledAt: Date | null;

  // Trial period tracking
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Configuration for a subscription tier's limits and capabilities
 * Defines what each tier can access
 */
export interface TierLimits {
  tier: SubscriptionTier;

  // Resource limits (-1 = UNLIMITED, -2 = NO_LIMIT for super_admin)
  maxCompetitionsOwned: number;
  maxRoundsPerCompetition: number;
  maxPlayersPerCompetition: number;
  maxFriends: number;
  maxRoundsPlayed: number; // Max rounds user can participate in

  // Feature access - Game types & formats
  allowedGameTypes: GameType[];
  canUseTeamFormats: boolean;
  canUseScoringPairs: boolean;
  canExportData: boolean;
  canUseApiCourseSearch: boolean;

  // Feature access - Statistics
  canViewBasicStats: boolean;
  canViewScoreDistribution: boolean;
  canViewAdvancedStats: boolean;
  canCompareStats: boolean;

  // Feature access - Admin
  canAccessAdminTools: boolean;

  // Billing & lifecycle
  requiresPayment: boolean;
  canExpire: boolean;

  // Display & UI
  displayName: string;
  description: string | null;
  badgeColor: string | null;
}

/**
 * Result of checking feature access for a user
 * Provides detailed information about why access was granted or denied
 */
export interface FeatureAccess {
  /** Whether the feature is allowed */
  allowed: boolean;

  /** Human-readable reason if access is denied */
  reason?: string;

  /** Whether upgrading would grant access */
  upgradeRequired: boolean;

  /** Minimum tier required for this feature */
  requiredTier?: SubscriptionTier;

  /** Current usage count (for limited features) */
  currentValue: number;

  /** Maximum allowed value (-1 = unlimited) */
  limitValue: number;
}

// =====================================================
// HELPER TYPES
// =====================================================

/**
 * Helper type for super admin checks
 * Returns true if user has super_admin tier
 */
export type IsSuperAdmin = boolean;

/**
 * Tier hierarchy for comparison (higher = more access)
 */
export const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  free: 0,
  social: 1,
  premium: 2,
  super_admin: 3,
};

// =====================================================
// TYPE GUARDS
// =====================================================

/**
 * Check if a string is a valid SubscriptionTier
 */
export function isSubscriptionTier(value: string): value is SubscriptionTier {
  return ['free', 'social', 'premium', 'super_admin'].includes(value);
}

/**
 * Check if a string is a valid SubscriptionStatus
 */
export function isSubscriptionStatus(value: string): value is SubscriptionStatus {
  return ['active', 'cancelled', 'expired', 'trial'].includes(value);
}

/**
 * Check if a string is a valid SubscriptionSource
 */
export function isSubscriptionSource(value: string): value is SubscriptionSource {
  return ['manual', 'revenuecat', 'stripe'].includes(value);
}

/**
 * Check if a string is a valid FeatureId
 */
export function isFeatureId(value: string): value is FeatureId {
  const validFeatures: FeatureId[] = [
    'create_competition',
    'add_round',
    'add_player',
    'game_type',
    'team_formats',
    'scoring_pairs',
    'add_friend',
    'compare_stats',
    'basic_stats',
    'score_distribution',
    'advanced_stats',
    'fir_gir_tracking',
    'export_data',
    'admin_tools',
  ];
  return validFeatures.includes(value as FeatureId);
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Check if a limit value represents unlimited access
 */
export function isUnlimited(limit: number): boolean {
  return limit === UNLIMITED || limit === NO_LIMIT;
}

/**
 * Check if a limit value represents no system limit (super_admin)
 */
export function isNoLimit(limit: number): boolean {
  return limit === NO_LIMIT;
}

/**
 * Compare two tiers, returns true if tierA >= tierB
 */
export function hasTierOrHigher(
  tierA: SubscriptionTier,
  tierB: SubscriptionTier
): boolean {
  return TIER_HIERARCHY[tierA] >= TIER_HIERARCHY[tierB];
}

/**
 * Get the next tier upgrade from current tier
 * Returns null if already at highest tier
 */
export function getNextTier(current: SubscriptionTier): SubscriptionTier | null {
  switch (current) {
    case 'free':
      return 'social';
    case 'social':
      return 'premium';
    case 'premium':
    case 'super_admin':
      return null;
  }
}

/**
 * Convert database UserSubscription (snake_case) to app UserSubscription (camelCase)
 */
export function mapDBUserSubscription(db: DBUserSubscription): UserSubscription {
  return {
    id: db.id,
    userId: db.user_id,
    tier: db.tier,
    status: db.status,
    source: db.source,
    externalId: db.external_id,
    productId: db.product_id,
    startedAt: new Date(db.started_at),
    expiresAt: db.expires_at ? new Date(db.expires_at) : null,
    cancelledAt: db.cancelled_at ? new Date(db.cancelled_at) : null,
    trialStartedAt: db.trial_started_at ? new Date(db.trial_started_at) : null,
    trialEndsAt: db.trial_ends_at ? new Date(db.trial_ends_at) : null,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

/**
 * Convert database TierLimits (snake_case) to app TierLimits (camelCase)
 */
export function mapDBTierLimits(db: DBTierLimits): TierLimits {
  return {
    tier: db.tier,
    maxCompetitionsOwned: db.max_competitions_owned,
    maxRoundsPerCompetition: db.max_rounds_per_competition,
    maxPlayersPerCompetition: db.max_players_per_competition,
    maxFriends: db.max_friends,
    maxRoundsPlayed: db.max_rounds_played,
    allowedGameTypes: db.allowed_game_types,
    canUseTeamFormats: db.can_use_team_formats,
    canUseScoringPairs: db.can_use_scoring_pairs,
    canExportData: db.can_export_data,
    canUseApiCourseSearch: db.can_use_api_course_search,
    canViewBasicStats: db.can_view_basic_stats,
    canViewScoreDistribution: db.can_view_score_distribution,
    canViewAdvancedStats: db.can_view_advanced_stats,
    canCompareStats: db.can_compare_stats,
    canAccessAdminTools: db.can_access_admin_tools,
    requiresPayment: db.requires_payment,
    canExpire: db.can_expire,
    displayName: db.display_name,
    description: db.description,
    badgeColor: db.badge_color,
  };
}
