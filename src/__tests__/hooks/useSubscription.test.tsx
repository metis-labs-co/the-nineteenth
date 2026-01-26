/**
 * useSubscription Hook Tests
 *
 * Tests for subscription management hook including:
 * - Feature access checking (checkFeature)
 * - Limit-based feature validation
 * - Game type access validation
 * - Boolean feature access
 * - Tier computation
 *
 * @see src/hooks/useSubscription.ts
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import type { SubscriptionTier } from '@/types/subscription.types';
import type { GameType } from '@/types/database.types';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Store mock data for Supabase
let mockSubscriptionData: any = null;
let mockTierLimitsData: any[] = [];

// Mock useAuth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
    isAuthenticated: true,
  }),
}));

// Mock AuthContext for isInitializing
jest.mock('@/context/AuthContext', () => ({
  useAuthContext: () => ({
    isInitializing: false,
  }),
}));

// Override the Supabase mock from jest.setup.js with custom data
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'user_subscriptions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(() => {
            if (mockSubscriptionData) {
              return Promise.resolve({ data: mockSubscriptionData, error: null });
            }
            return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'No rows found' } });
          }),
        };
      }
      if (table === 'tier_limits') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn(() => Promise.resolve({ data: mockTierLimitsData, error: null })),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      };
    }),
  },
}));

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create DB tier limits fixture (snake_case for Supabase)
 */
function createDBTierLimits(tier: SubscriptionTier, overrides: Partial<any> = {}): any {
  const defaults: Record<SubscriptionTier, any> = {
    free: {
      tier: 'free',
      max_competitions_owned: 3,
      max_rounds_per_competition: 2,
      max_players_per_competition: 10,
      max_friends: 10,
      allowed_game_types: ['stableford'],
      can_use_team_formats: false,
      can_use_scoring_pairs: false,
      can_export_data: false,
      can_use_api_course_search: false,
      can_view_basic_stats: true,
      can_view_score_distribution: false,
      can_view_advanced_stats: false,
      can_compare_stats: false,
      can_access_admin_tools: false,
      requires_payment: false,
      can_expire: true,
      display_name: 'Free',
      description: 'Free tier',
      badge_color: '#808080',
    },
    social: {
      tier: 'social',
      max_competitions_owned: 8,
      max_rounds_per_competition: 5,
      max_players_per_competition: 16,
      max_friends: 50,
      allowed_game_types: ['stableford', 'stroke', 'match-play'],
      can_use_team_formats: false,
      can_use_scoring_pairs: false,
      can_export_data: true,
      can_use_api_course_search: true,
      can_view_basic_stats: true,
      can_view_score_distribution: true,
      can_view_advanced_stats: false,
      can_compare_stats: true,
      can_access_admin_tools: false,
      requires_payment: true,
      can_expire: true,
      display_name: 'Social',
      description: 'Social tier',
      badge_color: '#4CAF50',
    },
    premium: {
      tier: 'premium',
      max_competitions_owned: -1,
      max_rounds_per_competition: 10,
      max_players_per_competition: 40,
      max_friends: -1,
      allowed_game_types: ['stableford', 'stroke', 'match-play', 'shamble', 'best-ball', 'scramble'],
      can_use_team_formats: true,
      can_use_scoring_pairs: true,
      can_export_data: true,
      can_use_api_course_search: true,
      can_view_basic_stats: true,
      can_view_score_distribution: true,
      can_view_advanced_stats: true,
      can_compare_stats: true,
      can_access_admin_tools: false,
      requires_payment: true,
      can_expire: true,
      display_name: 'Premium',
      description: 'Premium tier',
      badge_color: '#FFD700',
    },
    super_admin: {
      tier: 'super_admin',
      max_competitions_owned: -2,
      max_rounds_per_competition: -2,
      max_players_per_competition: -2,
      max_friends: -2,
      allowed_game_types: ['stableford', 'stroke', 'match-play', 'shamble', 'best-ball', 'scramble'],
      can_use_team_formats: true,
      can_use_scoring_pairs: true,
      can_export_data: true,
      can_use_api_course_search: true,
      can_view_basic_stats: true,
      can_view_score_distribution: true,
      can_view_advanced_stats: true,
      can_compare_stats: true,
      can_access_admin_tools: true,
      requires_payment: false,
      can_expire: false,
      display_name: 'Super Admin',
      description: 'Super admin tier',
      badge_color: '#FF0000',
    },
  };

  return { ...defaults[tier], ...overrides };
}

/**
 * Create DB user subscription fixture (snake_case for Supabase)
 */
function createDBUserSubscription(tier: SubscriptionTier): any {
  return {
    id: 'sub-123',
    user_id: 'test-user-123',
    tier,
    status: 'active',
    source: 'manual',
    external_id: null,
    product_id: null,
    started_at: new Date().toISOString(),
    expires_at: null,
    cancelled_at: null,
    trial_started_at: null,
    trial_ends_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Create test wrapper with QueryClient
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

/**
 * Setup mock Supabase data for a specific tier
 */
function setupMockData(tier: SubscriptionTier) {
  mockSubscriptionData = createDBUserSubscription(tier);
  mockTierLimitsData = [
    createDBTierLimits('free'),
    createDBTierLimits('social'),
    createDBTierLimits('premium'),
    createDBTierLimits('super_admin'),
  ];
}

// ============================================================================
// TEST SUITE: useSubscription - Feature Checking
// ============================================================================

describe('useSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscriptionData = null;
    mockTierLimitsData = [];
    useSubscriptionStore.getState().reset();
  });

  describe('checkFeature - Limit-based Features', () => {
    it('should allow create_competition when under limit', async () => {
      setupMockData('free');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('create_competition', { currentCount: 2 });

      expect(access.allowed).toBe(true);
      expect(access.upgradeRequired).toBe(false);
      expect(access.currentValue).toBe(2);
      expect(access.limitValue).toBe(3);
    });

    it('should deny create_competition when at limit', async () => {
      setupMockData('free');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('create_competition', { currentCount: 3 });

      expect(access.allowed).toBe(false);
      expect(access.upgradeRequired).toBe(true);
      expect(access.reason).toContain('maximum of 3');
      expect(access.requiredTier).toBe('social');
    });

    it('should allow add_round when under limit', async () => {
      setupMockData('free');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('add_round', { roundCount: 1 });

      expect(access.allowed).toBe(true);
    });

    it('should deny add_round when at limit', async () => {
      setupMockData('free');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('add_round', { roundCount: 2 });

      expect(access.allowed).toBe(false);
      expect(access.reason).toContain('maximum of 2');
    });

    it('should allow add_player when under limit', async () => {
      setupMockData('social');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('add_player', { playerCount: 15 });

      expect(access.allowed).toBe(true);
    });

    it('should deny add_player when at limit', async () => {
      setupMockData('social');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('add_player', { playerCount: 16 });

      expect(access.allowed).toBe(false);
      expect(access.reason).toContain('maximum of 16');
    });

    it('should allow unlimited competitions for premium', async () => {
      setupMockData('premium');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('create_competition', { currentCount: 100 });

      expect(access.allowed).toBe(true);
      expect(access.limitValue).toBe(-1); // Unlimited
    });
  });

  describe('checkFeature - Game Type Features', () => {
    it('should allow stableford for free tier', async () => {
      setupMockData('free');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('game_type', { gameType: 'stableford' });

      expect(access.allowed).toBe(true);
    });

    it('should deny stroke play for free tier', async () => {
      setupMockData('free');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('game_type', { gameType: 'stroke' });

      expect(access.allowed).toBe(false);
      expect(access.reason).toContain('Stroke Play');
      expect(access.reason).toContain('social');
    });

    it('should allow stroke play for social tier', async () => {
      setupMockData('social');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('game_type', { gameType: 'stroke' });

      expect(access.allowed).toBe(true);
    });

    it('should deny scramble for social tier', async () => {
      setupMockData('social');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('game_type', { gameType: 'scramble' });

      expect(access.allowed).toBe(false);
      expect(access.reason).toContain('premium');
    });

    it('should allow all game types for premium tier', async () => {
      setupMockData('premium');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const gameTypes: GameType[] = ['stableford', 'stroke', 'match-play', 'shamble', 'best-ball', 'scramble'];

      gameTypes.forEach((gameType) => {
        const access = result.current.checkFeature('game_type', { gameType });
        expect(access.allowed).toBe(true);
      });
    });

    it('should allow when no game type specified', async () => {
      setupMockData('free');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('game_type', {});

      expect(access.allowed).toBe(true);
    });
  });

  describe('checkFeature - Boolean Features', () => {
    it('should deny team_formats for free tier', async () => {
      setupMockData('free');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('team_formats');

      expect(access.allowed).toBe(false);
      expect(access.reason).toContain('Team formats');
      expect(access.requiredTier).toBe('premium');
    });

    it('should allow team_formats for premium tier', async () => {
      setupMockData('premium');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('team_formats');

      expect(access.allowed).toBe(true);
    });

    it('should deny scoring_pairs for social tier', async () => {
      setupMockData('social');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('scoring_pairs');

      expect(access.allowed).toBe(false);
    });

    it('should allow export_data for social tier', async () => {
      setupMockData('social');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('export_data');

      expect(access.allowed).toBe(true);
    });

    it('should deny export_data for free tier', async () => {
      setupMockData('free');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('export_data');

      expect(access.allowed).toBe(false);
    });

    it('should allow admin_tools for super_admin', async () => {
      setupMockData('super_admin');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('admin_tools');

      expect(access.allowed).toBe(true);
    });
  });

  describe('checkFeature - Super Admin', () => {
    it('should always allow all features for super_admin', async () => {
      setupMockData('super_admin');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      // Check various limit-based features
      expect(result.current.checkFeature('create_competition', { currentCount: 1000 }).allowed).toBe(true);
      expect(result.current.checkFeature('add_round', { roundCount: 100 }).allowed).toBe(true);
      expect(result.current.checkFeature('add_player', { playerCount: 500 }).allowed).toBe(true);

      // Check boolean features
      expect(result.current.checkFeature('team_formats').allowed).toBe(true);
      expect(result.current.checkFeature('scoring_pairs').allowed).toBe(true);
      expect(result.current.checkFeature('admin_tools').allowed).toBe(true);
      expect(result.current.checkFeature('advanced_stats').allowed).toBe(true);
    });

    it('should return NO_LIMIT for super_admin', async () => {
      setupMockData('super_admin');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('create_competition', { currentCount: 0 });

      expect(access.limitValue).toBe(-2); // NO_LIMIT constant
    });
  });

  describe('checkFeature - Edge Cases', () => {
    it('should handle unknown feature gracefully', async () => {
      setupMockData('premium');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('unknown_feature' as any);

      expect(access.allowed).toBe(false);
      expect(access.upgradeRequired).toBe(true);
      expect(access.reason).toContain('Unknown feature');
    });

    it('should allow by default when limits not loaded', async () => {
      // Don't setup mock data - limits will be null
      mockSubscriptionData = null;
      mockTierLimitsData = [];

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      // Check immediately before limits are loaded
      const access = result.current.checkFeature('create_competition', { currentCount: 100 });

      expect(access.allowed).toBe(true);
      expect(access.reason).toBe('Limits not loaded');
    });
  });

  describe('Tier Computation', () => {
    it('should return correct tier values for social', async () => {
      setupMockData('social');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.tier).toBe('social');
      });

      expect(result.current.isPremium).toBe(false);
      expect(result.current.isSocial).toBe(true);
      expect(result.current.isFree).toBe(false);
      expect(result.current.isSuperAdmin).toBe(false);
    });

    it('should identify premium tier correctly', async () => {
      setupMockData('premium');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.tier).toBe('premium');
      });

      expect(result.current.isPremium).toBe(true);
      expect(result.current.isSocial).toBe(true); // Premium includes social features
    });

    it('should identify super_admin with all access', async () => {
      setupMockData('super_admin');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.tier).toBe('super_admin');
      });

      expect(result.current.isSuperAdmin).toBe(true);
      expect(result.current.isPremium).toBe(true);
      expect(result.current.isSocial).toBe(true);
    });

    it('should default to free tier when no subscription', async () => {
      // Don't setup subscription data
      mockSubscriptionData = null;
      mockTierLimitsData = [
        createDBTierLimits('free'),
        createDBTierLimits('social'),
        createDBTierLimits('premium'),
        createDBTierLimits('super_admin'),
      ];

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.tier).toBe('free');
      });

      expect(result.current.isFree).toBe(true);
    });
  });
});

// ============================================================================
// NOTE: Helper hooks (useCheckFeature, useCanCreateCompetition, etc.) were
// removed as unnecessary indirection. Use useSubscription().checkFeature() directly.
// See: docs/progress/CONSOLIDATION-REFACTORING-PLAN.md task 7.2
// ============================================================================

// ============================================================================
// TEST SUITE: Additional Feature Checks
// ============================================================================

describe('useSubscription - Additional Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscriptionData = null;
    mockTierLimitsData = [];
    useSubscriptionStore.getState().reset();
  });

  describe('add_friend feature', () => {
    it('should allow add_friend when under limit', async () => {
      setupMockData('free');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('add_friend', { friendCount: 5 });
      expect(access.allowed).toBe(true);
    });

    it('should deny add_friend when at limit', async () => {
      setupMockData('free');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('add_friend', { friendCount: 10 });
      expect(access.allowed).toBe(false);
    });
  });

  describe('Stats features', () => {
    it('should allow basic_stats for free tier', async () => {
      setupMockData('free');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('basic_stats');
      expect(access.allowed).toBe(true);
    });

    it('should deny compare_stats for free tier', async () => {
      setupMockData('free');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('compare_stats');
      expect(access.allowed).toBe(false);
      expect(access.requiredTier).toBe('social');
    });

    it('should allow compare_stats for social tier', async () => {
      setupMockData('social');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('compare_stats');
      expect(access.allowed).toBe(true);
    });

    it('should deny score_distribution for free tier', async () => {
      setupMockData('free');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('score_distribution');
      expect(access.allowed).toBe(false);
    });

    it('should allow score_distribution for social tier', async () => {
      setupMockData('social');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('score_distribution');
      expect(access.allowed).toBe(true);
    });
  });

  describe('refresh function', () => {
    it('should invalidate queries when refresh is called', async () => {
      setupMockData('free');
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0, staleTime: 0 },
        },
      });

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe('Game type tier requirements', () => {
    it('should require social tier for stroke play', async () => {
      setupMockData('free');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('game_type', { gameType: 'stroke' });
      expect(access.allowed).toBe(false);
      expect(access.requiredTier).toBe('social');
    });

    it('should allow match-play for social tier', async () => {
      setupMockData('social');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      // Social tier includes match-play in allowed game types
      const access = result.current.checkFeature('game_type', { gameType: 'match-play' });
      expect(access.allowed).toBe(true);
    });

    it('should deny match-play for free tier', async () => {
      setupMockData('free');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('game_type', { gameType: 'match-play' });
      expect(access.allowed).toBe(false);
      expect(access.requiredTier).toBe('premium');
    });

    it('should require premium tier for shamble', async () => {
      setupMockData('social');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('game_type', { gameType: 'shamble' });
      expect(access.allowed).toBe(false);
      expect(access.requiredTier).toBe('premium');
    });

    it('should require premium tier for best-ball', async () => {
      setupMockData('social');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.limits).not.toBeNull();
      });

      const access = result.current.checkFeature('game_type', { gameType: 'best-ball' });
      expect(access.allowed).toBe(false);
      expect(access.requiredTier).toBe('premium');
    });
  });

  describe('Error handling', () => {
    it('should handle subscription fetch error', async () => {
      // Setup mock to throw error
      mockSubscriptionData = null;
      mockTierLimitsData = [
        createDBTierLimits('free'),
        createDBTierLimits('social'),
        createDBTierLimits('premium'),
        createDBTierLimits('super_admin'),
      ];

      // Override mock to throw actual error
      const mockSupabase = require('@/services/supabase/client').supabase;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_subscriptions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(() =>
              Promise.resolve({
                data: null,
                error: { code: 'UNKNOWN', message: 'Database error' },
              })
            ),
          };
        }
        if (table === 'tier_limits') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn(() =>
              Promise.resolve({ data: mockTierLimitsData, error: null })
            ),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        };
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should handle tier limits fetch error', async () => {
      mockSubscriptionData = createDBUserSubscription('free');
      mockTierLimitsData = [];

      // Override mock to throw error for tier_limits
      const mockSupabase = require('@/services/supabase/client').supabase;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_subscriptions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(() =>
              Promise.resolve({ data: mockSubscriptionData, error: null })
            ),
          };
        }
        if (table === 'tier_limits') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn(() =>
              Promise.resolve({
                data: null,
                error: { code: 'UNKNOWN', message: 'Failed to fetch tier limits' },
              })
            ),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        };
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscription(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });
});

// Note: The following features are tested indirectly through the main test suites above:
// - advanced_stats (boolean feature)
// - admin_tools (boolean feature)
// - stableford game type (covered by game_type tests)
// - scramble game type (covered by game_type tests)
// - add_friend (covered by limit-based feature tests)
// These are exercised through the comprehensive checkFeature tests with various tiers.
