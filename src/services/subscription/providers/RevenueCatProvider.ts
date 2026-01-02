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

import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PurchasesPackage,
  CustomerInfo,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { getCurrentUser } from '@/services/supabase/client';
import {
  ENTITLEMENT_IDS,
  getTierFromProductId,
  getBillingPeriod,
} from '@/constants/products';
import type { SubscriptionSource, SubscriptionTier } from '@/types/subscription.types';
import type { SubscriptionProvider } from './SubscriptionProvider';
import type {
  SubscriptionResult,
  SubscriptionProduct,
  AvailableProductsResult,
  PurchaseResult,
  RestorePurchasesResult,
  UserSubscription,
} from '../types';

export class RevenueCatSubscriptionProvider implements SubscriptionProvider {
  readonly type: SubscriptionSource = 'revenuecat';
  private initialized = false;

  /**
   * Get the RevenueCat API key for the current platform
   */
  private getApiKey(): string | null {
    const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? null;
    const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? null;

    console.log('[RevenueCatSubscriptionProvider] getApiKey called:', {
      platform: Platform.OS,
      iosKeyPresent: !!iosKey,
      androidKeyPresent: !!androidKey,
    });

    if (Platform.OS === 'ios') {
      return iosKey;
    }
    if (Platform.OS === 'android') {
      return androidKey;
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
    const platformSupported = Platform.OS === 'ios' || Platform.OS === 'android';
    const result = platformSupported && this.initialized;
    console.log('[RevenueCatSubscriptionProvider] supportsPurchases:', {
      platform: Platform.OS,
      platformSupported,
      initialized: this.initialized,
      result,
    });
    return result;
  }
}
