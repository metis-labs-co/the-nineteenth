/**
 * Subscription Service Abstraction
 *
 * Provides an abstraction layer for subscription providers to support
 * multiple payment backends (manual admin assignment, RevenueCat IAP, etc.)
 *
 * Current Implementation:
 * - ManualSubscriptionProvider: Queries Supabase directly, admin-only changes
 *
 * Future Implementation:
 * - RevenueCatSubscriptionProvider: Full IAP integration with RevenueCat SDK
 * - StripeSubscriptionProvider: Web-based payment integration
 *
 * @see docs/guides/SUBSCRIPTION_TIERS.md for full documentation
 */

import { supabase, getCurrentUser } from '@/services/supabase/client';
import { mapDBUserSubscription } from '@/types/subscription.types';
import type {
  UserSubscription,
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionSource,
} from '@/types/subscription.types';
import type { UserSubscription as DBUserSubscription } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

/**
 * Result of a subscription operation
 */
export interface SubscriptionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: SubscriptionErrorCode;
}

/**
 * Error codes for subscription operations
 */
export type SubscriptionErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'NOT_FOUND'
  | 'PURCHASE_DISABLED'
  | 'PURCHASE_FAILED'
  | 'RESTORE_FAILED'
  | 'NETWORK_ERROR'
  | 'PROVIDER_ERROR'
  | 'UNKNOWN';

/**
 * Product information for purchase
 */
export interface SubscriptionProduct {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  price: string;
  currency: string;
  period: 'monthly' | 'yearly';
}

/**
 * Available products result
 */
export interface AvailableProductsResult {
  products: SubscriptionProduct[];
}

/**
 * Purchase result
 */
export interface PurchaseResult {
  subscription: UserSubscription;
  transactionId?: string;
}

/**
 * Restore purchases result
 */
export interface RestorePurchasesResult {
  subscription: UserSubscription | null;
  restoredTransactions: number;
}

// =====================================================
// PROVIDER INTERFACE
// =====================================================

/**
 * Interface for subscription providers
 *
 * Implementations must handle:
 * - Initialization and cleanup
 * - Fetching current subscription state
 * - Product catalog and pricing
 * - Purchase flow
 * - Restore purchases
 *
 * @example
 * ```typescript
 * const provider = createSubscriptionProvider('manual');
 * await provider.initialize();
 * const subscription = await provider.getCurrentSubscription('user-123');
 * ```
 */
export interface SubscriptionProvider {
  /**
   * Provider identifier
   */
  readonly type: SubscriptionSource;

  /**
   * Initialize the subscription provider
   * Should be called once at app startup
   */
  initialize(): Promise<SubscriptionResult<void>>;

  /**
   * Clean up provider resources
   * Called when provider is no longer needed
   */
  cleanup(): Promise<void>;

  /**
   * Get the current subscription for a user
   * Returns null if user has no subscription (will be created as 'free')
   */
  getCurrentSubscription(userId: string): Promise<SubscriptionResult<UserSubscription | null>>;

  /**
   * Get available products for purchase
   * Returns empty array for providers that don't support purchases
   */
  getAvailableProducts(): Promise<SubscriptionResult<AvailableProductsResult>>;

  /**
   * Purchase a subscription product
   * May not be supported by all providers (e.g., manual)
   */
  purchaseProduct(productId: string): Promise<SubscriptionResult<PurchaseResult>>;

  /**
   * Restore previous purchases
   * Useful for users reinstalling the app or switching devices
   */
  restorePurchases(): Promise<SubscriptionResult<RestorePurchasesResult>>;

  /**
   * Check if the provider supports direct purchases
   */
  supportsPurchases(): boolean;
}

// =====================================================
// MANUAL SUBSCRIPTION PROVIDER
// =====================================================

/**
 * Manual Subscription Provider
 *
 * Queries Supabase directly for subscription state.
 * Purchases are disabled - users must contact support.
 *
 * Use cases:
 * - MVP phase before IAP integration
 * - Admin-assigned subscriptions
 * - Promotional or complimentary access
 * - Super admin accounts
 */
class ManualSubscriptionProvider implements SubscriptionProvider {
  readonly type: SubscriptionSource = 'manual';
  private initialized = false;

  async initialize(): Promise<SubscriptionResult<void>> {
    if (this.initialized) {
      return { success: true };
    }

    try {
      // For manual provider, initialization just validates Supabase connection
      const { error } = await supabase.from('tier_limits').select('tier').limit(1);

      if (error) {
        console.error('[ManualSubscriptionProvider] Init failed:', error);
        return {
          success: false,
          error: 'Failed to connect to subscription service',
          errorCode: 'NETWORK_ERROR',
        };
      }

      this.initialized = true;
      console.log('[ManualSubscriptionProvider] Initialized successfully');
      return { success: true };
    } catch (err) {
      console.error('[ManualSubscriptionProvider] Init error:', err);
      return {
        success: false,
        error: 'Failed to initialize subscription provider',
        errorCode: 'PROVIDER_ERROR',
      };
    }
  }

  async cleanup(): Promise<void> {
    this.initialized = false;
    console.log('[ManualSubscriptionProvider] Cleaned up');
  }

  async getCurrentSubscription(userId: string): Promise<SubscriptionResult<UserSubscription | null>> {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
        errorCode: 'NOT_AUTHENTICATED',
      };
    }

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[ManualSubscriptionProvider] Get subscription error:', error);
        return {
          success: false,
          error: `Failed to fetch subscription: ${error.message}`,
          errorCode: 'NETWORK_ERROR',
        };
      }

      // No subscription found - return null (caller should create free tier)
      if (!data) {
        return {
          success: true,
          data: null,
        };
      }

      // Map database type to app type
      const subscription = mapDBUserSubscription(data as unknown as DBUserSubscription);

      return {
        success: true,
        data: subscription,
      };
    } catch (err) {
      console.error('[ManualSubscriptionProvider] Get subscription error:', err);
      return {
        success: false,
        error: 'An unexpected error occurred',
        errorCode: 'UNKNOWN',
      };
    }
  }

  async getAvailableProducts(): Promise<SubscriptionResult<AvailableProductsResult>> {
    // Manual provider doesn't have purchasable products
    // Return placeholder products for display purposes only
    return {
      success: true,
      data: {
        products: [
          {
            id: 'com.thenineteenth.social.monthly',
            tier: 'social',
            name: 'Social',
            description: 'For casual golfers and social rounds',
            price: '$4.99',
            currency: 'AUD',
            period: 'monthly',
          },
          {
            id: 'com.thenineteenth.social.yearly',
            tier: 'social',
            name: 'Social (Annual)',
            description: 'For casual golfers and social rounds - save 17%',
            price: '$49.99',
            currency: 'AUD',
            period: 'yearly',
          },
          {
            id: 'com.thenineteenth.premium.monthly',
            tier: 'premium',
            name: 'Premium',
            description: 'Full access to all features',
            price: '$9.99',
            currency: 'AUD',
            period: 'monthly',
          },
          {
            id: 'com.thenineteenth.premium.yearly',
            tier: 'premium',
            name: 'Premium (Annual)',
            description: 'Full access to all features - save 17%',
            price: '$99.99',
            currency: 'AUD',
            period: 'yearly',
          },
        ],
      },
    };
  }

  async purchaseProduct(_productId: string): Promise<SubscriptionResult<PurchaseResult>> {
    // Manual provider does not support purchases
    return {
      success: false,
      error: 'In-app purchases are not available yet. Please contact support to upgrade your subscription.',
      errorCode: 'PURCHASE_DISABLED',
    };
  }

  async restorePurchases(): Promise<SubscriptionResult<RestorePurchasesResult>> {
    // For manual provider, just return current subscription state
    const user = await getCurrentUser();

    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to restore purchases',
        errorCode: 'NOT_AUTHENTICATED',
      };
    }

    const subscriptionResult = await this.getCurrentSubscription(user.id);

    if (!subscriptionResult.success) {
      return {
        success: false,
        error: subscriptionResult.error,
        errorCode: subscriptionResult.errorCode,
      };
    }

    return {
      success: true,
      data: {
        subscription: subscriptionResult.data ?? null,
        restoredTransactions: 0, // Manual provider has no transactions to restore
      },
    };
  }

  supportsPurchases(): boolean {
    return false;
  }
}

// =====================================================
// REVENUECAT SUBSCRIPTION PROVIDER (STUB)
// =====================================================

/**
 * RevenueCat Subscription Provider (Stub)
 *
 * TODO: Implement full RevenueCat SDK integration
 *
 * RevenueCat SDK Integration Steps:
 * 1. Install SDK: npx expo install react-native-purchases
 * 2. Configure in app.json: add plugin configuration
 * 3. Initialize with API key in initialize()
 * 4. Set up product identifiers in App Store Connect / Google Play Console
 * 5. Implement purchase flow with Purchases.purchaseProduct()
 * 6. Set up webhook handler for server-side validation
 *
 * @see https://docs.revenuecat.com/docs/reactnative
 * @see src/services/subscription/webhooks.ts for webhook handlers
 */
class RevenueCatSubscriptionProvider implements SubscriptionProvider {
  readonly type: SubscriptionSource = 'revenuecat';
  private initialized = false;
  private apiKey: string | null = null;

  constructor() {
    // TODO: Get API key from environment
    // this.apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? null;
  }

  async initialize(): Promise<SubscriptionResult<void>> {
    // TODO: Initialize RevenueCat SDK
    //
    // import Purchases from 'react-native-purchases';
    //
    // if (!this.apiKey) {
    //   return { success: false, error: 'RevenueCat API key not configured' };
    // }
    //
    // await Purchases.configure({ apiKey: this.apiKey });
    // await Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    //
    // // Set user ID after auth
    // const user = await getCurrentUser();
    // if (user) {
    //   await Purchases.logIn(user.id);
    // }

    console.warn('[RevenueCatSubscriptionProvider] Not implemented - using manual provider');
    return {
      success: false,
      error: 'RevenueCat integration not yet implemented',
      errorCode: 'PROVIDER_ERROR',
    };
  }

  async cleanup(): Promise<void> {
    // TODO: Clean up RevenueCat SDK
    // Purchases.removeCustomerInfoUpdateListener(listener);
    this.initialized = false;
  }

  async getCurrentSubscription(_userId: string): Promise<SubscriptionResult<UserSubscription | null>> {
    // TODO: Get customer info from RevenueCat
    //
    // try {
    //   const customerInfo = await Purchases.getCustomerInfo();
    //
    //   // Check for active entitlement
    //   if (customerInfo.entitlements.active['premium']) {
    //     // Map to our subscription type
    //     return {
    //       success: true,
    //       data: mapRevenueCatSubscription(customerInfo, 'premium'),
    //     };
    //   }
    //   if (customerInfo.entitlements.active['social']) {
    //     return {
    //       success: true,
    //       data: mapRevenueCatSubscription(customerInfo, 'social'),
    //     };
    //   }
    //
    //   return { success: true, data: null };
    // } catch (err) {
    //   return { success: false, error: err.message };
    // }

    return {
      success: false,
      error: 'RevenueCat integration not yet implemented',
      errorCode: 'PROVIDER_ERROR',
    };
  }

  async getAvailableProducts(): Promise<SubscriptionResult<AvailableProductsResult>> {
    // TODO: Get offerings from RevenueCat
    //
    // try {
    //   const offerings = await Purchases.getOfferings();
    //
    //   if (!offerings.current) {
    //     return { success: true, data: { products: [] } };
    //   }
    //
    //   const products = offerings.current.availablePackages.map(pkg => ({
    //     id: pkg.product.identifier,
    //     tier: mapProductToTier(pkg.product.identifier),
    //     name: pkg.product.title,
    //     description: pkg.product.description,
    //     price: pkg.product.priceString,
    //     currency: pkg.product.currencyCode,
    //     period: pkg.packageType === 'ANNUAL' ? 'yearly' : 'monthly',
    //   }));
    //
    //   return { success: true, data: { products } };
    // } catch (err) {
    //   return { success: false, error: err.message };
    // }

    return {
      success: false,
      error: 'RevenueCat integration not yet implemented',
      errorCode: 'PROVIDER_ERROR',
    };
  }

  async purchaseProduct(_productId: string): Promise<SubscriptionResult<PurchaseResult>> {
    // TODO: Implement purchase flow
    //
    // try {
    //   const offerings = await Purchases.getOfferings();
    //   const pkg = offerings.current?.availablePackages.find(
    //     p => p.product.identifier === productId
    //   );
    //
    //   if (!pkg) {
    //     return { success: false, error: 'Product not found' };
    //   }
    //
    //   const { customerInfo, productIdentifier } = await Purchases.purchasePackage(pkg);
    //
    //   // Sync to our database via webhook (handled server-side)
    //   // For now, just return the updated subscription state
    //   const tier = mapProductToTier(productIdentifier);
    //
    //   return {
    //     success: true,
    //     data: {
    //       subscription: mapRevenueCatSubscription(customerInfo, tier),
    //       transactionId: customerInfo.originalAppUserId,
    //     },
    //   };
    // } catch (err) {
    //   if (err.userCancelled) {
    //     return { success: false, error: 'Purchase cancelled' };
    //   }
    //   return { success: false, error: err.message };
    // }

    return {
      success: false,
      error: 'RevenueCat integration not yet implemented',
      errorCode: 'PROVIDER_ERROR',
    };
  }

  async restorePurchases(): Promise<SubscriptionResult<RestorePurchasesResult>> {
    // TODO: Restore purchases via RevenueCat
    //
    // try {
    //   const customerInfo = await Purchases.restorePurchases();
    //
    //   let subscription: UserSubscription | null = null;
    //   if (customerInfo.entitlements.active['premium']) {
    //     subscription = mapRevenueCatSubscription(customerInfo, 'premium');
    //   } else if (customerInfo.entitlements.active['social']) {
    //     subscription = mapRevenueCatSubscription(customerInfo, 'social');
    //   }
    //
    //   return {
    //     success: true,
    //     data: {
    //       subscription,
    //       restoredTransactions: customerInfo.allPurchaseDates ? Object.keys(customerInfo.allPurchaseDates).length : 0,
    //     },
    //   };
    // } catch (err) {
    //   return { success: false, error: err.message };
    // }

    return {
      success: false,
      error: 'RevenueCat integration not yet implemented',
      errorCode: 'PROVIDER_ERROR',
    };
  }

  supportsPurchases(): boolean {
    // TODO: Return true when implemented
    return false;
  }
}

// =====================================================
// PROVIDER FACTORY
// =====================================================

/**
 * Provider type for factory selection
 */
export type ProviderType = 'manual' | 'revenuecat';

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
 * Default subscription service using manual provider
 *
 * Usage:
 * ```typescript
 * import { subscriptionService } from '@/services/subscription';
 *
 * await subscriptionService.initialize();
 * const result = await subscriptionService.getCurrentSubscription(userId);
 * ```
 */
export const subscriptionService: SubscriptionProvider = createSubscriptionProvider('manual');

export default subscriptionService;
