/**
 * Subscription Database Types
 * User subscriptions and tier limits
 */

import type { SubscriptionTier, SubscriptionStatus, SubscriptionSource, GameType } from './enums';

/**
 * User subscription for tiered access control
 * Supports manual subscriptions and RevenueCat/Stripe integration
 */
export interface UserSubscription {
  id: string; // UUID
  user_id: string; // UUID, references auth.users(id)

  // Subscription details
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  source: SubscriptionSource;

  // External payment provider IDs
  external_id: string | null; // RevenueCat subscriber ID or Stripe customer ID
  product_id: string | null; // App Store/Play Store product ID

  // Subscription dates
  started_at: string; // ISO timestamp
  expires_at: string | null; // ISO timestamp, NULL for free tier
  cancelled_at: string | null; // ISO timestamp

  // Trial period tracking
  trial_started_at: string | null; // ISO timestamp
  trial_ends_at: string | null; // ISO timestamp

  // Timestamps
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Configuration for subscription tier limits and feature access
 * One row per tier defining all limits and capabilities
 *
 * Special values for limit columns:
 *   -1 = unlimited (no limit enforced)
 *   -2 = no system limit (bypass all checks, used for super_admin)
 */
export interface TierLimits {
  id: string; // UUID
  tier: SubscriptionTier;

  // Resource limits
  max_competitions_owned: number; // -1 = unlimited, -2 = no system limit
  max_rounds_per_competition: number;
  max_players_per_competition: number;
  max_friends: number;

  // Feature access - Game types & formats
  allowed_game_types: GameType[]; // Array of allowed game types
  can_use_team_formats: boolean;
  can_use_scoring_pairs: boolean;
  can_export_data: boolean;
  can_use_api_course_search: boolean;

  // Feature access - Statistics
  can_view_basic_stats: boolean;
  can_view_score_distribution: boolean;
  can_view_advanced_stats: boolean;
  can_compare_stats: boolean;

  // Feature access - Admin
  can_access_admin_tools: boolean;

  // Billing & lifecycle
  requires_payment: boolean;
  can_expire: boolean;

  // Display & UI
  display_name: string;
  description: string | null;
  badge_color: string | null; // Hex color code

  // Timestamps
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}
