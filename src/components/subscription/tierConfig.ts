/**
 * Tier Configuration
 *
 * Centralized configuration for subscription tiers used in the Paywall and related components.
 * Contains tier features, colors, descriptions, and display metadata.
 */

// ============================================================================
// TYPES
// ============================================================================

export type PaywallTier = 'social' | 'premium' | 'enterprise';

export interface TierConfig {
  /** Tier identifier */
  id: PaywallTier;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Icon name (react-native-paper Icon) */
  icon: string;
  /** Theme color for the tier */
  color: string;
  /** Features included in this tier */
  features: string[];
}

// ============================================================================
// TIER COLORS
// ============================================================================

/**
 * Tier-specific colors
 * These match the colors used in UpgradePrompt and TierBadge
 */
export const TIER_COLORS: Record<PaywallTier, string> = {
  social: '#3b82f6',
  premium: '#f59e0b',
  enterprise: '#8b5cf6',
} as const;

// ============================================================================
// TIER CONFIGURATIONS
// ============================================================================

/**
 * Complete tier configurations
 */
export const TIER_CONFIGS: Record<PaywallTier, TierConfig> = {
  social: {
    id: 'social',
    name: 'Social',
    description: 'For casual golfers',
    icon: 'account-group-outline',
    color: TIER_COLORS.social,
    features: [
      'Up to 8 competitions',
      'Up to 5 rounds per competition',
      'Up to 12 players per competition',
      '15 friends',
      'Unlimited social rounds',
      'Stroke Play & Match Play',
      'Compare stats with friends',
      'Score distribution analytics',
      'Detailed statistics (par type, putting, short game)',
      'Handicap history',
      'Achievement leaderboard',
      'AI competition creation',
      'Guest player management',
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'For serious organisers',
    icon: 'crown-outline',
    color: TIER_COLORS.premium,
    features: [
      'Up to 50 competitions',
      'Up to 50 leagues',
      'Up to 10 rounds per competition',
      'Up to 40 players per competition',
      'Unlimited friends',
      'All game types including team formats',
      'Advanced analytics & trends',
      'Scoring pairs for competitive rounds',
      'Skins side-game',
      'Wolf side-game',
      'Prize pools',
      'Priority support',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organisations',
    icon: 'domain',
    color: TIER_COLORS.enterprise,
    features: [
      'Up to 200 competitions',
      'Up to 200 leagues',
      'Up to 20 rounds per competition',
      'Up to 100 players per competition',
      'Unlimited friends',
      'All premium features',
      'Priority support',
    ],
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get tier configuration by tier ID
 */
export function getTierConfig(tier: PaywallTier): TierConfig {
  return TIER_CONFIGS[tier];
}

/**
 * Get tier color by tier ID
 */
export function getTierColor(tier: PaywallTier): string {
  return TIER_COLORS[tier];
}

/**
 * Get tier features by tier ID
 */
export function getTierFeatures(tier: PaywallTier): string[] {
  return TIER_CONFIGS[tier].features;
}
