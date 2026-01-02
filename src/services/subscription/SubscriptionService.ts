/**
 * Subscription Service
 *
 * Orchestrates subscription providers and exposes a unified API.
 * Uses the appropriate provider based on environment configuration.
 *
 * Current Implementations:
 * - ManualSubscriptionProvider: Queries Supabase directly, admin-only changes
 * - RevenueCatSubscriptionProvider: Full IAP integration with RevenueCat SDK
 *
 * @see docs/guides/SUBSCRIPTION_TIERS.md for full documentation
 */

import { Platform } from 'react-native';
import type { SubscriptionProvider } from './providers/SubscriptionProvider';
import { ManualSubscriptionProvider } from './providers/ManualProvider';
import { RevenueCatSubscriptionProvider } from './providers/RevenueCatProvider';
import type { ProviderType } from './types';

// Re-export types for convenience
export type {
  SubscriptionResult,
  SubscriptionErrorCode,
  SubscriptionProduct,
  AvailableProductsResult,
  PurchaseResult,
  RestorePurchasesResult,
  ProviderType,
} from './types';

// Re-export provider interface
export type { SubscriptionProvider } from './providers/SubscriptionProvider';

// =====================================================
// PROVIDER FACTORY
// =====================================================

/**
 * Create a subscription provider instance
 *
 * @param type - Provider type to create
 * @returns SubscriptionProvider instance
 *
 * @example
 * ```typescript
 * // MVP: Use manual provider
 * const provider = createSubscriptionProvider('manual');
 *
 * // Future: Use RevenueCat for IAP
 * const provider = createSubscriptionProvider('revenuecat');
 * ```
 */
export function createSubscriptionProvider(type: ProviderType): SubscriptionProvider {
  switch (type) {
    case 'revenuecat':
      return new RevenueCatSubscriptionProvider();
    case 'manual':
    default:
      return new ManualSubscriptionProvider();
  }
}

// =====================================================
// SINGLETON SERVICE
// =====================================================

/**
 * Determine which provider to use based on environment
 * Check for iOS key first (primary), then Android
 */
function getProviderType(): ProviderType {
  const revenueCatApiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : Platform.OS === 'android'
        ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
        : null;

  return revenueCatApiKey ? 'revenuecat' : 'manual';
}

// Determine provider type and log debug info
const providerType = getProviderType();

// Debug logging for subscription service initialization
console.log('[SubscriptionService] Platform:', Platform.OS);
console.log('[SubscriptionService] Provider type:', providerType);
console.log('[SubscriptionService] __DEV__:', __DEV__);
if (providerType === 'revenuecat') {
  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  if (apiKey) {
    console.log('[SubscriptionService] API key (first 8 chars):', apiKey.substring(0, 8) + '...');
  }
}

/**
 * Default subscription service singleton
 *
 * Uses RevenueCat for iOS in-app purchases when API key is configured,
 * falls back to manual provider otherwise.
 *
 * Usage:
 * ```typescript
 * import { subscriptionService } from '@/services/subscription';
 *
 * await subscriptionService.initialize();
 * const result = await subscriptionService.getCurrentSubscription(userId);
 * ```
 */
export const subscriptionService: SubscriptionProvider = createSubscriptionProvider(providerType);

/** Export the provider type for debugging */
export const currentProviderType = providerType;

export default subscriptionService;
