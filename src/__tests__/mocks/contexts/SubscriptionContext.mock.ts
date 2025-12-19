/**
 * Subscription Context Mock
 *
 * Provides mock implementations of subscription context hooks for testing.
 * Use these to test tier-gated features and subscription behavior.
 */

import type {
  SubscriptionTier,
  FeatureAccess,
  FeatureId,
  TierLimits,
} from '@/types/subscription.types';

// ============================================================================
// TYPES
// ============================================================================

export type MockTier = SubscriptionTier;

// ============================================================================
// MOCK TIER LIMITS
// ============================================================================

export const mockTierLimits: Record<SubscriptionTier, TierLimits> = {
  free: {
    tier: 'free',
    maxCompetitionsOwned: 3,
    maxRoundsPerCompetition: 2,
    maxPlayersPerCompetition: 10,
    maxFriends: 10,
    allowedGameTypes: ['stableford'],
    features: {
      export_data: false,
      advanced_stats: false,
      scoring_pairs: false,
      team_formats: false,
    },
  },
  social: {
    tier: 'social',
    maxCompetitionsOwned: 8,
    maxRoundsPerCompetition: 5,
    maxPlayersPerCompetition: 16,
    maxFriends: 50,
    allowedGameTypes: ['stableford', 'stroke', 'match-play', 'best-ball', 'ambrose'],
    features: {
      export_data: false,
      advanced_stats: true,
      scoring_pairs: false,
      team_formats: true,
    },
  },
  premium: {
    tier: 'premium',
    maxCompetitionsOwned: -1, // unlimited
    maxRoundsPerCompetition: 10,
    maxPlayersPerCompetition: 40,
    maxFriends: -1, // unlimited
    allowedGameTypes: ['stableford', 'stroke', 'match-play', 'best-ball', 'ambrose', 'aggregate'],
    features: {
      export_data: true,
      advanced_stats: true,
      scoring_pairs: true,
      team_formats: true,
    },
  },
  super_admin: {
    tier: 'super_admin',
    maxCompetitionsOwned: -1,
    maxRoundsPerCompetition: -1,
    maxPlayersPerCompetition: -1,
    maxFriends: -1,
    allowedGameTypes: ['stableford', 'stroke', 'match-play', 'best-ball', 'ambrose', 'aggregate'],
    features: {
      export_data: true,
      advanced_stats: true,
      scoring_pairs: true,
      team_formats: true,
    },
  },
};

// ============================================================================
// MOCK VALUES
// ============================================================================

/**
 * Create a mock subscription context value
 */
export function createMockSubscriptionContext(tier: MockTier = 'premium') {
  const limits = mockTierLimits[tier];

  return {
    // State
    subscription: {
      id: 'mock-subscription-id',
      user_id: 'mock-user-id',
      tier,
      status: 'active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: null,
    },
    limits,
    allTierLimits: mockTierLimits,
    isLoading: false,
    isError: false,
    error: null,

    // Computed values
    tier,
    isPremium: tier === 'premium' || tier === 'super_admin',
    isSocial: tier !== 'free',
    isFree: tier === 'free',
    isSuperAdmin: tier === 'super_admin',

    // Feature checking
    checkFeature: jest.fn((featureId: FeatureId): FeatureAccess => {
      const featureAllowed = limits.features[featureId as keyof typeof limits.features];
      return {
        allowed: featureAllowed ?? true,
        reason: featureAllowed ? null : `Upgrade required for ${featureId}`,
        requiredTier: featureAllowed ? null : 'premium',
      };
    }),

    // Convenience methods
    checkCanCreateCompetition: jest.fn((currentCount: number): FeatureAccess => {
      const max = limits.maxCompetitionsOwned;
      const allowed = max === -1 || currentCount < max;
      return {
        allowed,
        reason: allowed ? null : `Competition limit reached (${max})`,
        currentCount,
        limit: max,
      };
    }),

    checkCanAddRound: jest.fn((_compId: string, currentCount: number): FeatureAccess => {
      const max = limits.maxRoundsPerCompetition;
      const allowed = max === -1 || currentCount < max;
      return {
        allowed,
        reason: allowed ? null : `Round limit reached (${max})`,
        currentCount,
        limit: max,
      };
    }),

    checkCanAddPlayer: jest.fn((_compId: string, currentCount: number): FeatureAccess => {
      const max = limits.maxPlayersPerCompetition;
      const allowed = max === -1 || currentCount < max;
      return {
        allowed,
        reason: allowed ? null : `Player limit reached (${max})`,
        currentCount,
        limit: max,
      };
    }),

    checkGameType: jest.fn((gameType: string): FeatureAccess => {
      const allowed = limits.allowedGameTypes.includes(gameType as any);
      return {
        allowed,
        reason: allowed ? null : `${gameType} not available on ${tier} tier`,
        requiredTier: allowed ? null : 'social',
      };
    }),

    // Actions
    refresh: jest.fn().mockResolvedValue(undefined),
  };
}

// ============================================================================
// JEST MOCK FACTORY
// ============================================================================

/**
 * Create jest.mock factory for SubscriptionContext
 *
 * @example
 * jest.mock('@/context/SubscriptionContext', () => createSubscriptionContextMock('free'));
 */
export function createSubscriptionContextMock(tier: MockTier = 'premium') {
  const mockContext = createMockSubscriptionContext(tier);

  return {
    SubscriptionProvider: ({ children }: { children: React.ReactNode }) => children,
    useSubscriptionContext: () => mockContext,
    useTier: () => tier,
    useTierLimits: () => mockTierLimits[tier],
    useIsPremium: () => tier === 'premium' || tier === 'super_admin',
    useCheckFeature: () => mockContext.checkFeature,
  };
}

// ============================================================================
// PRESET MOCKS
// ============================================================================

export const freeTierMock = createMockSubscriptionContext('free');
export const socialTierMock = createMockSubscriptionContext('social');
export const premiumTierMock = createMockSubscriptionContext('premium');
export const superAdminMock = createMockSubscriptionContext('super_admin');
