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
    maxRoundsPlayed: 20, // 20 rounds for free tier
    maxLeaguesOwned: 1,
    allowedGameTypes: ['stableford', 'stroke'],
    canUseTeamFormats: false,
    canUseScoringPairs: false,
    canExportData: false,
    canUseApiCourseSearch: true,
    canViewBasicStats: true,
    canViewScoreDistribution: false,
    canViewAdvancedStats: false,
    canCompareStats: false,
    canViewDetailedStats: false,
    canViewHandicapHistory: false,
    canViewAchievementLeaderboard: false,
    canUseAiCompetition: false,
    canManageGuests: false,
    canUseGpsDistance: false,
    canUseSkinsGame: false,
    canUseWolfGame: false,
    canUsePrizePool: false,
    canUseAdvancedRoundRules: false,
    canCreateLeague: true,
    canJoinLeague: true,
    canAccessAdminTools: false,
    canAccessBetaFeatures: false,
    requiresPayment: false,
    canExpire: true,
    displayName: 'Free',
    description: 'Get started with basic golf competition features',
    badgeColor: '#6b7280',
  },
  social: {
    tier: 'social',
    maxCompetitionsOwned: 8,
    maxRoundsPerCompetition: 5,
    maxPlayersPerCompetition: 12,
    maxFriends: 50,
    maxRoundsPlayed: -1, // unlimited
    maxLeaguesOwned: 3,
    allowedGameTypes: ['stableford', 'stroke', 'match-play', 'best-ball', 'shamble'],
    canUseTeamFormats: false,
    canUseScoringPairs: false,
    canExportData: true,
    canUseApiCourseSearch: true,
    canViewBasicStats: true,
    canViewScoreDistribution: true,
    canViewAdvancedStats: false,
    canCompareStats: true,
    canViewDetailedStats: true,
    canViewHandicapHistory: true,
    canViewAchievementLeaderboard: true,
    canUseAiCompetition: true,
    canManageGuests: true,
    canUseGpsDistance: true,
    canUseSkinsGame: false,
    canUseWolfGame: false,
    canUsePrizePool: false,
    canUseAdvancedRoundRules: false,
    canCreateLeague: true,
    canJoinLeague: true,
    canAccessAdminTools: false,
    canAccessBetaFeatures: false,
    requiresPayment: true,
    canExpire: true,
    displayName: 'Social',
    description: 'Perfect for casual golfers and social groups',
    badgeColor: '#3b82f6',
  },
  premium: {
    tier: 'premium',
    maxCompetitionsOwned: -1, // unlimited
    maxRoundsPerCompetition: 10,
    maxPlayersPerCompetition: 40,
    maxFriends: -1, // unlimited
    maxRoundsPlayed: -1, // unlimited
    maxLeaguesOwned: -1, // unlimited
    allowedGameTypes: ['stableford', 'stroke', 'match-play', 'best-ball', 'shamble', 'scramble'],
    canUseTeamFormats: true,
    canUseScoringPairs: true,
    canExportData: true,
    canUseApiCourseSearch: true,
    canViewBasicStats: true,
    canViewScoreDistribution: true,
    canViewAdvancedStats: true,
    canCompareStats: true,
    canViewDetailedStats: true,
    canViewHandicapHistory: true,
    canViewAchievementLeaderboard: true,
    canUseAiCompetition: true,
    canManageGuests: true,
    canUseGpsDistance: true,
    canUseSkinsGame: true,
    canUseWolfGame: true,
    canUsePrizePool: true,
    canUseAdvancedRoundRules: true,
    canCreateLeague: true,
    canJoinLeague: true,
    canAccessAdminTools: false,
    canAccessBetaFeatures: false,
    requiresPayment: true,
    canExpire: true,
    displayName: 'Premium',
    description: 'Full-featured experience for serious competition organisers',
    badgeColor: '#f59e0b',
  },
  super_admin: {
    tier: 'super_admin',
    maxCompetitionsOwned: -2, // no system limit
    maxRoundsPerCompetition: -2,
    maxPlayersPerCompetition: -2,
    maxFriends: -1,
    maxRoundsPlayed: -2, // no system limit
    maxLeaguesOwned: -2, // no system limit
    allowedGameTypes: ['stableford', 'stroke', 'match-play', 'best-ball', 'shamble', 'scramble'],
    canUseTeamFormats: true,
    canUseScoringPairs: true,
    canExportData: true,
    canUseApiCourseSearch: true,
    canViewBasicStats: true,
    canViewScoreDistribution: true,
    canViewAdvancedStats: true,
    canCompareStats: true,
    canViewDetailedStats: true,
    canViewHandicapHistory: true,
    canViewAchievementLeaderboard: true,
    canUseAiCompetition: true,
    canManageGuests: true,
    canUseGpsDistance: true,
    canUseSkinsGame: true,
    canUseWolfGame: true,
    canUsePrizePool: true,
    canUseAdvancedRoundRules: true,
    canCreateLeague: true,
    canJoinLeague: true,
    canAccessAdminTools: true,
    canAccessBetaFeatures: false,
    requiresPayment: false,
    canExpire: false,
    displayName: 'Super Admin',
    description: 'Internal team accounts with full system access',
    badgeColor: '#dc2626',
  },
  enterprise: {
    tier: 'enterprise',
    maxCompetitionsOwned: 200,
    maxRoundsPerCompetition: 20,
    maxPlayersPerCompetition: 100,
    maxFriends: -1,
    maxRoundsPlayed: -1,
    maxLeaguesOwned: 200,
    allowedGameTypes: ['stableford', 'stroke', 'match-play', 'best-ball', 'shamble', 'scramble'],
    canUseTeamFormats: true,
    canUseScoringPairs: true,
    canExportData: true,
    canUseApiCourseSearch: true,
    canViewBasicStats: true,
    canViewScoreDistribution: true,
    canViewAdvancedStats: true,
    canCompareStats: true,
    canViewDetailedStats: true,
    canViewHandicapHistory: true,
    canViewAchievementLeaderboard: true,
    canUseAiCompetition: true,
    canManageGuests: true,
    canUseGpsDistance: true,
    canUseSkinsGame: true,
    canUseWolfGame: true,
    canUsePrizePool: true,
    canUseAdvancedRoundRules: true,
    canCreateLeague: true,
    canJoinLeague: true,
    canAccessAdminTools: false,
    canAccessBetaFeatures: false,
    requiresPayment: true,
    canExpire: true,
    displayName: 'Enterprise',
    description: 'For large organisations and serious competition organisers',
    badgeColor: '#8b5cf6',
  },
  developer: {
    tier: 'developer',
    maxCompetitionsOwned: -2,
    maxRoundsPerCompetition: -2,
    maxPlayersPerCompetition: -2,
    maxFriends: -1,
    maxRoundsPlayed: -2,
    maxLeaguesOwned: -2,
    allowedGameTypes: ['stableford', 'stroke', 'match-play', 'best-ball', 'shamble', 'scramble'],
    canUseTeamFormats: true,
    canUseScoringPairs: true,
    canExportData: true,
    canUseApiCourseSearch: true,
    canViewBasicStats: true,
    canViewScoreDistribution: true,
    canViewAdvancedStats: true,
    canCompareStats: true,
    canViewDetailedStats: true,
    canViewHandicapHistory: true,
    canViewAchievementLeaderboard: true,
    canUseAiCompetition: true,
    canManageGuests: true,
    canUseGpsDistance: true,
    canUseSkinsGame: true,
    canUseWolfGame: true,
    canUsePrizePool: true,
    canUseAdvancedRoundRules: true,
    canCreateLeague: true,
    canJoinLeague: true,
    canAccessAdminTools: true,
    canAccessBetaFeatures: true,
    requiresPayment: false,
    canExpire: false,
    displayName: 'Developer',
    description: 'Internal beta access for testing work-in-progress features',
    badgeColor: '#06b6d4',
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
    isPremium:
      tier === 'premium' ||
      tier === 'enterprise' ||
      tier === 'super_admin' ||
      tier === 'developer',
    isSocial: tier !== 'free',
    isFree: tier === 'free',
    isSuperAdmin: tier === 'super_admin' || tier === 'developer',

    // Feature checking
    checkFeature: jest.fn((featureId: FeatureId): FeatureAccess => {
      const featureMap: Record<string, boolean> = {
        export_data: limits.canExportData,
        advanced_stats: limits.canViewAdvancedStats,
        scoring_pairs: limits.canUseScoringPairs,
        team_formats: limits.canUseTeamFormats,
        basic_stats: limits.canViewBasicStats,
        score_distribution: limits.canViewScoreDistribution,
        compare_stats: limits.canCompareStats,
        admin_tools: limits.canAccessAdminTools,
        detailed_stats: limits.canViewDetailedStats,
        handicap_history: limits.canViewHandicapHistory,
        achievement_leaderboard: limits.canViewAchievementLeaderboard,
        ai_competition: limits.canUseAiCompetition,
        manage_guests: limits.canManageGuests,
        gps_distance: limits.canUseGpsDistance,
        skins_game: limits.canUseSkinsGame,
        wolf_game: limits.canUseWolfGame,
        prize_pool: limits.canUsePrizePool,
        create_league: limits.canCreateLeague,
        join_league: limits.canJoinLeague,
      };
      const featureAllowed = featureMap[featureId] ?? true;
      return {
        allowed: featureAllowed,
        reason: featureAllowed ? undefined : `Upgrade required for ${featureId}`,
        requiredTier: featureAllowed ? undefined : 'premium',
        upgradeRequired: !featureAllowed,
        currentValue: 0,
        limitValue: -1,
      };
    }),

    // Convenience methods
    checkCanCreateCompetition: jest.fn((currentCount: number): FeatureAccess => {
      const max = limits.maxCompetitionsOwned;
      const allowed = max === -1 || max === -2 || currentCount < max;
      return {
        allowed,
        reason: allowed ? undefined : `Competition limit reached (${max})`,
        upgradeRequired: !allowed,
        currentValue: currentCount,
        limitValue: max,
      };
    }),

    checkCanAddRound: jest.fn((_compId: string, currentCount: number): FeatureAccess => {
      const max = limits.maxRoundsPerCompetition;
      const allowed = max === -1 || max === -2 || currentCount < max;
      return {
        allowed,
        reason: allowed ? undefined : `Round limit reached (${max})`,
        upgradeRequired: !allowed,
        currentValue: currentCount,
        limitValue: max,
      };
    }),

    checkCanAddPlayer: jest.fn((_compId: string, currentCount: number): FeatureAccess => {
      const max = limits.maxPlayersPerCompetition;
      const allowed = max === -1 || max === -2 || currentCount < max;
      return {
        allowed,
        reason: allowed ? undefined : `Player limit reached (${max})`,
        upgradeRequired: !allowed,
        currentValue: currentCount,
        limitValue: max,
      };
    }),

    checkCanPlayRound: jest.fn((currentCount: number): FeatureAccess => {
      const max = limits.maxRoundsPlayed;
      const allowed = max === -1 || max === -2 || currentCount < max;
      return {
        allowed,
        reason: allowed ? undefined : `Rounds played limit reached (${max})`,
        upgradeRequired: !allowed,
        currentValue: currentCount,
        limitValue: max,
      };
    }),

    checkGameType: jest.fn((gameType: string): FeatureAccess => {
      const allowed = limits.allowedGameTypes.includes(gameType as any);
      return {
        allowed,
        reason: allowed ? undefined : `${gameType} not available on ${tier} tier`,
        requiredTier: allowed ? undefined : 'social',
        upgradeRequired: !allowed,
        currentValue: 0,
        limitValue: -1,
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
    useIsPremium: () =>
      tier === 'premium' ||
      tier === 'enterprise' ||
      tier === 'super_admin' ||
      tier === 'developer',
    useCheckFeature: () => mockContext.checkFeature,
  };
}

// ============================================================================
// PRESET MOCKS
// ============================================================================

export const freeTierMock = createMockSubscriptionContext('free');
export const socialTierMock = createMockSubscriptionContext('social');
export const premiumTierMock = createMockSubscriptionContext('premium');
export const enterpriseTierMock = createMockSubscriptionContext('enterprise');
export const superAdminMock = createMockSubscriptionContext('super_admin');
export const developerTierMock = createMockSubscriptionContext('developer');
