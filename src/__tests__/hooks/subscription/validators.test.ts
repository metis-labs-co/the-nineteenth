/**
 * Subscription Validators Tests
 *
 * Tests for the subscription validation functions including:
 * - validateFeatureAccess for various feature types
 * - FIR/GIR tracking feature validation
 * - Limit-based, boolean, and game type checks
 */

import {
  checkLimitFeature,
  checkGameTypeFeature,
  checkBooleanFeature,
  validateFeatureAccess,
  getRequiredTierForGameType,
  createSuperAdminAccess,
  createDefaultAccess,
  createUnknownFeatureAccess,
} from '@/hooks/subscription/validators';
import type { TierLimits, FeatureCheckContext } from '@/hooks/subscription/types';
import type { GameType } from '@/types/database.types';

// ===========================================================================
// TEST FIXTURES
// ===========================================================================

const createFreeTierLimits = (): TierLimits => ({
  tier: 'free',
  maxCompetitionsOwned: 3,
  maxRoundsPerCompetition: 2,
  maxPlayersPerCompetition: 4,
  maxFriends: 10,
  maxRoundsPlayed: 20,
  maxLeaguesOwned: 1,
  canJoinLeague: true,
  allowedGameTypes: ['stableford'] as GameType[],
  canUseTeamFormats: false,
  canUseScoringPairs: false,
  canExportData: false,
  canUseApiCourseSearch: true,
  canViewBasicStats: true,
  canViewAdvancedStats: false,
  canViewScoreDistribution: false,
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
  canCreateLeague: false,
  canAccessAdminTools: false,
  canAccessBetaFeatures: false,
  requiresPayment: false,
  canExpire: true,
  displayName: 'Free',
  description: 'Get started with basic golf competition features',
  badgeColor: '#6b7280',
});

const createPremiumTierLimits = (): TierLimits => ({
  tier: 'premium',
  maxCompetitionsOwned: -1, // Unlimited
  maxRoundsPerCompetition: 10,
  maxPlayersPerCompetition: 40,
  maxFriends: 100,
  maxRoundsPlayed: -1,
  maxLeaguesOwned: -1, // Unlimited
  canJoinLeague: true,
  allowedGameTypes: ['stableford', 'stroke', 'match-play', 'shamble', 'best-ball', 'scramble'] as GameType[],
  canUseTeamFormats: true,
  canUseScoringPairs: true,
  canExportData: true,
  canUseApiCourseSearch: true,
  canViewBasicStats: true,
  canViewAdvancedStats: true,
  canViewScoreDistribution: true,
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
  canAccessAdminTools: false,
  canAccessBetaFeatures: false,
  requiresPayment: true,
  canExpire: true,
  displayName: 'Premium',
  description: 'Full-featured experience for serious competition organisers',
  badgeColor: '#f59e0b',
});

const createSocialTierLimits = (): TierLimits => ({
  tier: 'social',
  maxCompetitionsOwned: 8,
  maxRoundsPerCompetition: 5,
  maxPlayersPerCompetition: 12,
  maxFriends: 30,
  maxRoundsPlayed: -1,
  maxLeaguesOwned: 3,
  canJoinLeague: true,
  allowedGameTypes: ['stableford', 'stroke', 'match-play'] as GameType[],
  canUseTeamFormats: false,
  canUseScoringPairs: false,
  canExportData: true,
  canUseApiCourseSearch: true,
  canViewBasicStats: true,
  canViewAdvancedStats: false,
  canViewScoreDistribution: true,
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
  canAccessAdminTools: false,
  canAccessBetaFeatures: false,
  requiresPayment: true,
  canExpire: true,
  displayName: 'Social',
  description: 'Perfect for casual golfers and social groups',
  badgeColor: '#3b82f6',
});

const createDefaultContext = (overrides: Partial<FeatureCheckContext> = {}): FeatureCheckContext => ({
  currentCount: 0,
  ...overrides,
});

// ===========================================================================
// checkLimitFeature TESTS
// ===========================================================================

describe('checkLimitFeature', () => {
  it('should return allowed=true when under limit', () => {
    const result = checkLimitFeature(2, 5, 'competitions', 'social', 'free');

    expect(result.allowed).toBe(true);
    expect(result.upgradeRequired).toBe(false);
    expect(result.currentValue).toBe(2);
    expect(result.limitValue).toBe(5);
  });

  it('should return allowed=false when at limit', () => {
    const result = checkLimitFeature(5, 5, 'competitions', 'social', 'free');

    expect(result.allowed).toBe(false);
    expect(result.upgradeRequired).toBe(true);
    expect(result.requiredTier).toBe('social');
    expect(result.reason).toContain('reached the maximum');
  });

  it('should return allowed=false when over limit', () => {
    const result = checkLimitFeature(7, 5, 'competitions', 'social', 'free');

    expect(result.allowed).toBe(false);
    expect(result.upgradeRequired).toBe(true);
  });

  it('should return allowed=true when limit is unlimited (-1)', () => {
    const result = checkLimitFeature(100, -1, 'competitions', 'social', 'free');

    expect(result.allowed).toBe(true);
    expect(result.upgradeRequired).toBe(false);
  });
});

// ===========================================================================
// checkGameTypeFeature TESTS
// ===========================================================================

describe('checkGameTypeFeature', () => {
  it('should return allowed=true for allowed game type', () => {
    const allowedTypes: GameType[] = ['stableford', 'stroke'];
    const result = checkGameTypeFeature('stableford', allowedTypes);

    expect(result.allowed).toBe(true);
    expect(result.upgradeRequired).toBe(false);
  });

  it('should return allowed=false for disallowed game type', () => {
    const allowedTypes: GameType[] = ['stableford'];
    const result = checkGameTypeFeature('match-play', allowedTypes);

    expect(result.allowed).toBe(false);
    expect(result.upgradeRequired).toBe(true);
    expect(result.requiredTier).toBe('premium');
  });

  it('should return allowed=true when no game type specified', () => {
    const allowedTypes: GameType[] = ['stableford'];
    const result = checkGameTypeFeature(undefined, allowedTypes);

    expect(result.allowed).toBe(true);
  });
});

// ===========================================================================
// checkBooleanFeature TESTS
// ===========================================================================

describe('checkBooleanFeature', () => {
  it('should return allowed=true when feature is allowed', () => {
    const result = checkBooleanFeature(true, 'Team formats', 'premium');

    expect(result.allowed).toBe(true);
    expect(result.upgradeRequired).toBe(false);
  });

  it('should return allowed=false when feature is not allowed', () => {
    const result = checkBooleanFeature(false, 'Team formats', 'premium');

    expect(result.allowed).toBe(false);
    expect(result.upgradeRequired).toBe(true);
    expect(result.requiredTier).toBe('premium');
    expect(result.reason).toContain('Team formats');
    expect(result.reason).toContain('premium');
  });
});

// ===========================================================================
// getRequiredTierForGameType TESTS
// ===========================================================================

describe('getRequiredTierForGameType', () => {
  it('should return free for stableford', () => {
    expect(getRequiredTierForGameType('stableford')).toBe('free');
  });

  it('should return social for stroke play', () => {
    expect(getRequiredTierForGameType('stroke')).toBe('social');
  });

  it('should return premium for match-play', () => {
    expect(getRequiredTierForGameType('match-play')).toBe('premium');
  });

  it('should return premium for team formats', () => {
    expect(getRequiredTierForGameType('shamble')).toBe('premium');
    expect(getRequiredTierForGameType('best-ball')).toBe('premium');
    expect(getRequiredTierForGameType('scramble')).toBe('premium');
  });
});

// ===========================================================================
// validateFeatureAccess - fir_gir_tracking TESTS
// ===========================================================================

describe('validateFeatureAccess - fir_gir_tracking', () => {
  it('should return allowed=true when canViewAdvancedStats is true', () => {
    const limits = createPremiumTierLimits();
    const context = createDefaultContext();

    const result = validateFeatureAccess('fir_gir_tracking', limits, 'premium', context);

    expect(result.allowed).toBe(true);
    expect(result.upgradeRequired).toBe(false);
  });

  it('should return allowed=false when canViewAdvancedStats is false', () => {
    const limits = createFreeTierLimits();
    const context = createDefaultContext();

    const result = validateFeatureAccess('fir_gir_tracking', limits, 'free', context);

    expect(result.allowed).toBe(false);
    expect(result.upgradeRequired).toBe(true);
  });

  it('should return requiredTier="premium" when not allowed', () => {
    const limits = createFreeTierLimits();
    const context = createDefaultContext();

    const result = validateFeatureAccess('fir_gir_tracking', limits, 'free', context);

    expect(result.requiredTier).toBe('premium');
  });

  it('should return correct featureName in result', () => {
    const limits = createFreeTierLimits();
    const context = createDefaultContext();

    const result = validateFeatureAccess('fir_gir_tracking', limits, 'free', context);

    expect(result.reason).toContain('FIR/GIR tracking');
  });
});

// ===========================================================================
// validateFeatureAccess - other features TESTS
// ===========================================================================

describe('validateFeatureAccess - other features', () => {
  it('should validate create_competition feature', () => {
    const limits = createFreeTierLimits();
    const context = createDefaultContext({ currentCount: 5 }); // Over limit

    const result = validateFeatureAccess('create_competition', limits, 'free', context);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('competitions');
  });

  it('should validate team_formats feature', () => {
    const limits = createFreeTierLimits();
    const context = createDefaultContext();

    const result = validateFeatureAccess('team_formats', limits, 'free', context);

    expect(result.allowed).toBe(false);
    expect(result.requiredTier).toBe('premium');
  });

  it('should validate scoring_pairs feature', () => {
    const limits = createFreeTierLimits();
    const context = createDefaultContext();

    const result = validateFeatureAccess('scoring_pairs', limits, 'free', context);

    expect(result.allowed).toBe(false);
    expect(result.requiredTier).toBe('premium');
  });

  it('should validate advanced_stats feature', () => {
    const limits = createFreeTierLimits();
    const context = createDefaultContext();

    const result = validateFeatureAccess('advanced_stats', limits, 'free', context);

    expect(result.allowed).toBe(false);
    expect(result.requiredTier).toBe('premium');
  });

  it('should return unknown feature access for invalid feature', () => {
    const limits = createFreeTierLimits();
    const context = createDefaultContext();

    const result = validateFeatureAccess('invalid_feature', limits, 'free', context);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Unknown feature');
  });

  describe('create_league', () => {
    it('should allow on free tier within limit', () => {
      const result = validateFeatureAccess(
        'create_league',
        createFreeTierLimits(),
        'free',
        { currentCount: 0 }
      );
      expect(result.allowed).toBe(true);
    });

    it('should deny on free tier at limit', () => {
      const result = validateFeatureAccess(
        'create_league',
        createFreeTierLimits(),
        'free',
        { currentCount: 1 }
      );
      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe(true);
    });

    it('should allow on social tier within limit', () => {
      const result = validateFeatureAccess(
        'create_league',
        createSocialTierLimits(),
        'social',
        { currentCount: 1 }
      );
      expect(result.allowed).toBe(true);
    });

    it('should deny on social tier at limit', () => {
      const result = validateFeatureAccess(
        'create_league',
        createSocialTierLimits(),
        'social',
        { currentCount: 3 }
      );
      expect(result.allowed).toBe(false);
    });

    it('should allow on premium tier (unlimited)', () => {
      const result = validateFeatureAccess(
        'create_league',
        createPremiumTierLimits(),
        'premium',
        { currentCount: 100 }
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe('join_league', () => {
    it('should allow on free tier', () => {
      const result = validateFeatureAccess(
        'join_league',
        createFreeTierLimits(),
        'free',
        {}
      );
      expect(result.allowed).toBe(true);
    });

    it('should allow on social tier', () => {
      const result = validateFeatureAccess(
        'join_league',
        createSocialTierLimits(),
        'social',
        {}
      );
      expect(result.allowed).toBe(true);
    });
  });
});

// ===========================================================================
// Helper functions TESTS
// ===========================================================================

describe('Helper functions', () => {
  it('createSuperAdminAccess should return allowed=true', () => {
    const context = createDefaultContext({ currentCount: 100 });

    const result = createSuperAdminAccess(context);

    expect(result.allowed).toBe(true);
    expect(result.upgradeRequired).toBe(false);
    expect(result.currentValue).toBe(100);
  });

  it('createDefaultAccess should return allowed=true (fail open)', () => {
    const context = createDefaultContext();

    const result = createDefaultAccess(context);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('Limits not loaded');
  });

  it('createUnknownFeatureAccess should return allowed=false', () => {
    const result = createUnknownFeatureAccess('test_feature');

    expect(result.allowed).toBe(false);
    expect(result.upgradeRequired).toBe(true);
    expect(result.reason).toContain('Unknown feature: test_feature');
  });
});
