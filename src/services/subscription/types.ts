/**
 * Subscription Service Types
 *
 * Shared types for subscription providers and service.
 * @see docs/guides/SUBSCRIPTION_TIERS.md
 */

import type {
  UserSubscription,
  SubscriptionTier,
  SubscriptionSource,
} from '@/types/subscription.types';

// Re-export for convenience
export type { UserSubscription, SubscriptionTier, SubscriptionSource };

// =====================================================
// RESULT TYPES
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

// =====================================================
// PRODUCT TYPES
// =====================================================

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
  period: 'monthly' | 'yearly' | 'lifetime';
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
// PROVIDER TYPES
// =====================================================

/**
 * Provider type for factory selection
 */
export type ProviderType = 'manual' | 'revenuecat';
