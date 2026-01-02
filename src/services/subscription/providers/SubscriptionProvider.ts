/**
 * Subscription Provider Interface
 *
 * Defines the contract for subscription providers.
 * @see docs/guides/SUBSCRIPTION_TIERS.md
 */

import type { SubscriptionSource } from '@/types/subscription.types';
import type {
  SubscriptionResult,
  AvailableProductsResult,
  PurchaseResult,
  RestorePurchasesResult,
  UserSubscription,
} from '../types';

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
