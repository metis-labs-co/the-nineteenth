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

import { supabase, getCurrentUser } from '@/services/supabase/client';
import { mapDBUserSubscription } from '@/types/subscription.types';
import type { UserSubscription as DBUserSubscription } from '@/types/database.types';
import type { SubscriptionSource } from '@/types/subscription.types';
import type { SubscriptionProvider } from './SubscriptionProvider';
import type {
  SubscriptionResult,
  AvailableProductsResult,
  PurchaseResult,
  RestorePurchasesResult,
  UserSubscription,
} from '../types';

export class ManualSubscriptionProvider implements SubscriptionProvider {
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
