/**
 * Subscription Store - Zustand state management for user subscriptions
 *
 * Manages subscription state including:
 * - User's current subscription (tier, status, limits)
 * - All tier limits configuration (for upgrade comparisons)
 * - Persisted to AsyncStorage for offline support
 * - Selector hooks for tier-based feature gating
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  UserSubscription,
  TierLimits,
  SubscriptionTier,
} from '@/types/subscription.types';

// =====================================================
// STATE INTERFACE
// =====================================================

interface SubscriptionState {
  // User's current subscription
  subscription: UserSubscription | null;

  // Limits for user's current tier
  limits: TierLimits | null;

  // All tier limits (for upgrade comparisons and UI)
  allTierLimits: Record<SubscriptionTier, TierLimits> | null;

  // Loading state for async operations
  isLoading: boolean;

  // Timestamp of last successful fetch (for cache invalidation)
  lastFetched: number | null;

  // Actions
  setSubscription: (subscription: UserSubscription | null) => void;
  setLimits: (limits: TierLimits | null) => void;
  setAllTierLimits: (allLimits: Record<SubscriptionTier, TierLimits> | null) => void;
  setLoading: (isLoading: boolean) => void;
  reset: () => void;
}

// =====================================================
// DEFAULT STATE
// =====================================================

const DEFAULT_STATE = {
  subscription: null,
  limits: null,
  allTierLimits: null,
  isLoading: false,
  lastFetched: null,
};

// =====================================================
// STORE
// =====================================================

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      // Initial state
      ...DEFAULT_STATE,

      // Actions
      setSubscription: (subscription) => set({ subscription }),

      setLimits: (limits) => set({ limits }),

      setAllTierLimits: (allTierLimits) => set({ allTierLimits }),

      setLoading: (isLoading) => set({ isLoading }),

      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'subscription-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist subscription data, not loading state
      partialize: (state) => ({
        subscription: state.subscription,
        limits: state.limits,
        allTierLimits: state.allTierLimits,
        lastFetched: state.lastFetched,
      }),
    }
  )
);

// =====================================================
// SELECTOR HOOKS
// =====================================================

/**
 * Get the user's current subscription tier
 * Returns 'free' if no subscription exists
 */
export function useSubscriptionTier(): SubscriptionTier {
  return useSubscriptionStore((state) => state.subscription?.tier ?? 'free');
}

/**
 * Check if user has premium tier or higher (premium or super_admin)
 * Use for premium-only features
 */
export function useIsPremium(): boolean {
  return useSubscriptionStore((state) => {
    const tier = state.subscription?.tier;
    return tier === 'premium' || tier === 'super_admin';
  });
}

/**
 * Check if user has social tier or higher (social, premium, or super_admin)
 * Use for features available to paying users
 */
export function useIsSocial(): boolean {
  return useSubscriptionStore((state) => {
    const tier = state.subscription?.tier;
    return tier === 'social' || tier === 'premium' || tier === 'super_admin';
  });
}

/**
 * Check if user is a super admin
 * Super admins have unrestricted access to all features
 */
export function useIsSuperAdmin(): boolean {
  return useSubscriptionStore((state) => state.subscription?.tier === 'super_admin');
}

/**
 * Check if user has full feature access (premium or super_admin)
 * Alias for useIsPremium - use for general feature checks
 */
export function useHasFullAccess(): boolean {
  return useSubscriptionStore((state) => {
    const tier = state.subscription?.tier;
    return tier === 'premium' || tier === 'super_admin';
  });
}

/**
 * Get the user's tier limits
 * Returns null if limits haven't been loaded
 */
export function useTierLimits(): TierLimits | null {
  return useSubscriptionStore((state) => state.limits);
}

/**
 * Check if subscription data is stale and needs refresh
 * Data is considered stale after 1 hour
 */
export function useIsSubscriptionStale(): boolean {
  const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
  return useSubscriptionStore((state) => {
    if (!state.lastFetched) return true;
    return Date.now() - state.lastFetched > STALE_THRESHOLD_MS;
  });
}

/**
 * Get subscription loading state
 */
export function useSubscriptionLoading(): boolean {
  return useSubscriptionStore((state) => state.isLoading);
}

// =====================================================
// NON-HOOK HELPERS (for use outside React components)
// =====================================================

/**
 * Get current tier without hook (for use in services/utils)
 */
export function getCurrentTier(): SubscriptionTier {
  return useSubscriptionStore.getState().subscription?.tier ?? 'free';
}

/**
 * Check if current user is super admin (for use in services/utils)
 */
export function isSuperAdmin(): boolean {
  return useSubscriptionStore.getState().subscription?.tier === 'super_admin';
}

/**
 * Check if current user has premium or higher (for use in services/utils)
 */
export function hasPremiumAccess(): boolean {
  const tier = useSubscriptionStore.getState().subscription?.tier;
  return tier === 'premium' || tier === 'super_admin';
}
