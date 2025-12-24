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

import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PurchasesPackage,
  CustomerInfo,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { supabase, getCurrentUser } from '@/services/supabase/client';
import { mapDBUserSubscription } from '@/types/subscription.types';
import {
  PRODUCT_IDS,
  ENTITLEMENT_IDS,
  ENTITLEMENT_TO_TIER,
  getTierFromProductId,
  getBillingPeriod,
} from '@/constants/products';
import type {
  UserSubscription,
  SubscriptionTier,
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
  | 'PURCHASE_CANCELLED'
  | 'RESTORE_FAILED'
  | 'NETWORK_ERROR'
  | 'PROVIDER_ERROR'
  | 'PRODUCT_NOT_FOUND'
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
// REVENUECAT SUBSCRIPTION PROVIDER
// =====================================================

/**
 * RevenueCat Subscription Provider
 *
 * Full IAP integration using RevenueCat SDK for App Store subscriptions.
 *
 * Features:
 * - Initialize with platform-specific API key
 * - Fetch current subscription from RevenueCat
 * - Get available products with real App Store prices
 * - Handle purchase flow with proper error handling
 * - Restore purchases for reinstalls/device transfers
 *
 * @see https://docs.revenuecat.com/docs/reactnative
 * @see src/services/subscription/webhooks.ts for server-side sync
 */
class RevenueCatSubscriptionProvider implements SubscriptionProvider {
  readonly type: SubscriptionSource = 'revenuecat';
  private initialized = false;

  /**
   * Get the RevenueCat API key for the current platform
   */
  private getApiKey(): string | null {
    if (Platform.OS === 'ios') {
      return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? null;
    }
    if (Platform.OS === 'android') {
      return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? null;
    }
    return null;
  }

  /**
   * Map RevenueCat CustomerInfo to our UserSubscription type
   */
  private mapCustomerInfoToSubscription(
    customerInfo: CustomerInfo,
    tier: SubscriptionTier
  ): UserSubscription {
    // Find the most relevant entitlement
    const entitlement =
      customerInfo.entitlements.active[ENTITLEMENT_IDS.PREMIUM] ??
      customerInfo.entitlements.active[ENTITLEMENT_IDS.SOCIAL];

    const now = new Date();
    const expiresAt = entitlement?.expirationDate
      ? new Date(entitlement.expirationDate)
      : null;

    return {
      id: customerInfo.originalAppUserId,
      userId: customerInfo.originalAppUserId,
      tier,
      status: entitlement ? 'active' : 'expired',
      source: 'revenuecat',
      externalId: customerInfo.originalAppUserId,
      productId: entitlement?.productIdentifier ?? null,
      startedAt: entitlement?.latestPurchaseDate
        ? new Date(entitlement.latestPurchaseDate)
        : now,
      expiresAt,
      cancelledAt: null,
      trialStartedAt: null,
      trialEndsAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Determine subscription tier from CustomerInfo entitlements
   */
  private getTierFromCustomerInfo(customerInfo: CustomerInfo): SubscriptionTier {
    // Check entitlements in order of precedence (highest first)
    if (customerInfo.entitlements.active[ENTITLEMENT_IDS.PREMIUM]) {
      return 'premium';
    }
    if (customerInfo.entitlements.active[ENTITLEMENT_IDS.SOCIAL]) {
      return 'social';
    }
    return 'free';
  }

  /**
   * Find a package in offerings by product ID
   */
  private findPackageByProductId(
    offerings: Awaited<ReturnType<typeof Purchases.getOfferings>>,
    productId: string
  ): PurchasesPackage | null {
    if (!offerings.current) return null;

    return (
      offerings.current.availablePackages.find(
        (pkg) => pkg.product.identifier === productId
      ) ?? null
    );
  }

  async initialize(): Promise<SubscriptionResult<void>> {
    if (this.initialized) {
      return { success: true };
    }

    try {
      const apiKey = this.getApiKey();

      if (!apiKey) {
        console.warn(
          '[RevenueCatSubscriptionProvider] API key not configured. ' +
            'Set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY in your environment.'
        );
        return {
          success: false,
          error: 'RevenueCat API key not configured',
          errorCode: 'PROVIDER_ERROR',
        };
      }

      // Set log level for debugging (VERBOSE in dev for setup, ERROR in prod)
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
      } else {
        Purchases.setLogLevel(LOG_LEVEL.ERROR);
      }

      // Configure RevenueCat with API key
      Purchases.configure({ apiKey });

      // If user is already authenticated, log them in to RevenueCat
      const user = await getCurrentUser();
      if (user) {
        await Purchases.logIn(user.id);
        console.log(`[RevenueCatSubscriptionProvider] Logged in user: ${user.id}`);
      }

      this.initialized = true;
      console.log('[RevenueCatSubscriptionProvider] Initialized successfully');
      return { success: true };
    } catch (err) {
      console.error('[RevenueCatSubscriptionProvider] Init error:', err);
      return {
        success: false,
        error: 'Failed to initialize RevenueCat',
        errorCode: 'PROVIDER_ERROR',
      };
    }
  }

  async cleanup(): Promise<void> {
    // RevenueCat doesn't require explicit cleanup, but we reset our state
    this.initialized = false;
    console.log('[RevenueCatSubscriptionProvider] Cleaned up');
  }

  async getCurrentSubscription(
    userId: string
  ): Promise<SubscriptionResult<UserSubscription | null>> {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
        errorCode: 'NOT_AUTHENTICATED',
      };
    }

    try {
      // Ensure user is logged in to RevenueCat
      const { customerInfo } = await Purchases.logIn(userId);

      // Determine tier from active entitlements
      const tier = this.getTierFromCustomerInfo(customerInfo);

      // If no paid tier, return null (will be treated as free)
      if (tier === 'free') {
        return { success: true, data: null };
      }

      // Map to our subscription type
      const subscription = this.mapCustomerInfoToSubscription(customerInfo, tier);

      return { success: true, data: subscription };
    } catch (err) {
      console.error('[RevenueCatSubscriptionProvider] Get subscription error:', err);

      // Handle specific RevenueCat errors
      if (err instanceof Error) {
        return {
          success: false,
          error: err.message,
          errorCode: 'NETWORK_ERROR',
        };
      }

      return {
        success: false,
        error: 'Failed to fetch subscription',
        errorCode: 'UNKNOWN',
      };
    }
  }

  async getAvailableProducts(): Promise<SubscriptionResult<AvailableProductsResult>> {
    try {
      const offerings = await Purchases.getOfferings();

      if (!offerings.current) {
        console.warn('[RevenueCatSubscriptionProvider] No current offering available');
        return { success: true, data: { products: [] } };
      }

      const products: SubscriptionProduct[] = offerings.current.availablePackages.map(
        (pkg) => {
          const productId = pkg.product.identifier;
          const tier = getTierFromProductId(productId) ?? 'social';
          const period = getBillingPeriod(productId) ?? 'monthly';

          return {
            id: productId,
            tier,
            name: pkg.product.title,
            description: pkg.product.description,
            price: pkg.product.priceString,
            currency: pkg.product.currencyCode,
            period,
          };
        }
      );

      return { success: true, data: { products } };
    } catch (err) {
      console.error('[RevenueCatSubscriptionProvider] Get products error:', err);
      return {
        success: false,
        error: 'Failed to fetch products',
        errorCode: 'NETWORK_ERROR',
      };
    }
  }

  async purchaseProduct(productId: string): Promise<SubscriptionResult<PurchaseResult>> {
    try {
      // Get current offerings
      const offerings = await Purchases.getOfferings();
      const pkg = this.findPackageByProductId(offerings, productId);

      if (!pkg) {
        return {
          success: false,
          error: `Product not found: ${productId}`,
          errorCode: 'PRODUCT_NOT_FOUND',
        };
      }

      // Attempt purchase
      const { customerInfo } = await Purchases.purchasePackage(pkg);

      // Determine the tier from the purchase
      const tier = getTierFromProductId(productId) ?? 'social';

      // Create subscription object
      const subscription = this.mapCustomerInfoToSubscription(customerInfo, tier);

      console.log(
        `[RevenueCatSubscriptionProvider] Purchase successful: ${productId} -> ${tier}`
      );

      return {
        success: true,
        data: {
          subscription,
          transactionId: customerInfo.originalAppUserId,
        },
      };
    } catch (err: unknown) {
      console.error('[RevenueCatSubscriptionProvider] Purchase error:', err);

      // Handle RevenueCat-specific errors
      const purchaseError = err as { code?: PURCHASES_ERROR_CODE; message?: string; userCancelled?: boolean };

      // User cancelled the purchase
      if (purchaseError.userCancelled || purchaseError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        return {
          success: false,
          error: 'Purchase cancelled',
          errorCode: 'PURCHASE_CANCELLED',
        };
      }

      // Network error
      if (purchaseError.code === PURCHASES_ERROR_CODE.NETWORK_ERROR) {
        return {
          success: false,
          error: 'Network error. Please check your connection and try again.',
          errorCode: 'NETWORK_ERROR',
        };
      }

      // Product already purchased (might need restore)
      if (purchaseError.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
        return {
          success: false,
          error:
            'This product is already purchased. Try restoring purchases instead.',
          errorCode: 'PURCHASE_FAILED',
        };
      }

      return {
        success: false,
        error: purchaseError.message ?? 'Purchase failed. Please try again.',
        errorCode: 'PURCHASE_FAILED',
      };
    }
  }

  async restorePurchases(): Promise<SubscriptionResult<RestorePurchasesResult>> {
    try {
      const customerInfo = await Purchases.restorePurchases();

      // Determine tier from restored entitlements
      const tier = this.getTierFromCustomerInfo(customerInfo);

      // Count restored transactions
      const restoredTransactions = customerInfo.allPurchaseDates
        ? Object.keys(customerInfo.allPurchaseDates).length
        : 0;

      // If no paid tier, return null subscription
      if (tier === 'free') {
        return {
          success: true,
          data: {
            subscription: null,
            restoredTransactions,
          },
        };
      }

      // Map to our subscription type
      const subscription = this.mapCustomerInfoToSubscription(customerInfo, tier);

      console.log(
        `[RevenueCatSubscriptionProvider] Restored ${restoredTransactions} transactions, tier: ${tier}`
      );

      return {
        success: true,
        data: {
          subscription,
          restoredTransactions,
        },
      };
    } catch (err) {
      console.error('[RevenueCatSubscriptionProvider] Restore error:', err);

      if (err instanceof Error) {
        return {
          success: false,
          error: err.message,
          errorCode: 'RESTORE_FAILED',
        };
      }

      return {
        success: false,
        error: 'Failed to restore purchases',
        errorCode: 'UNKNOWN',
      };
    }
  }

  supportsPurchases(): boolean {
    // Support purchases on iOS and Android when initialized
    return (Platform.OS === 'ios' || Platform.OS === 'android') && this.initialized;
  }
}

// =====================================================
// REVENUECAT USER ID MANAGEMENT
// =====================================================

/**
 * Log in a user to RevenueCat
 * Call this when the user signs in to your app
 *
 * @param userId - The Supabase user ID
 */
export async function loginToRevenueCat(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId);
    console.log(`[RevenueCat] Logged in user: ${userId}`);
  } catch (err) {
    console.error('[RevenueCat] Login error:', err);
  }
}

/**
 * Log out the current user from RevenueCat
 * Call this when the user signs out of your app
 */
export async function logoutFromRevenueCat(): Promise<void> {
  try {
    await Purchases.logOut();
    console.log('[RevenueCat] Logged out');
  } catch (err) {
    console.error('[RevenueCat] Logout error:', err);
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
 * Default subscription service
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
export const subscriptionService: SubscriptionProvider = createSubscriptionProvider(
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ? 'revenuecat' : 'manual'
);

export default subscriptionService;
