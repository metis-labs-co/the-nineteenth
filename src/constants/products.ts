/**
 * IAP Product ID Mappings for The Nineteenth
 *
 * Maps App Store / Google Play product IDs to subscription tiers.
 * These IDs should match the products configured in App Store Connect
 * and Google Play Console.
 *
 * Product ID naming convention:
 * - {bundle_id}.{tier}.{billing_period}
 * - e.g., 'com.thenineteenth.social.monthly'
 *
 * @see https://docs.revenuecat.com/docs/product-setup
 */

import type { SubscriptionTier } from '@/types/subscription.types';

// =====================================================
// PRODUCT ID CONSTANTS
// =====================================================

/**
 * App bundle identifier
 * Note: Using 'com.thenineteenth' for product IDs even though app uses 'golf.thenineteenth'
 * This is because App Store product IDs were registered with this prefix
 */
export const BUNDLE_ID = 'the.nineteenth';

/**
 * Product IDs for iOS App Store
 */
export const IOS_PRODUCT_IDS = {
  // Social tier
  SOCIAL_MONTHLY: `${BUNDLE_ID}.social.monthly`,
  SOCIAL_YEARLY: `${BUNDLE_ID}.social.yearly`,

  // Premium tier
  PREMIUM_MONTHLY: `${BUNDLE_ID}.premium.monthly`,
  PREMIUM_YEARLY: `${BUNDLE_ID}.premium.yearly`,
} as const;

/**
 * Product IDs for Google Play Store
 * Note: Google Play uses the same IDs but with different subscription/base plan structure
 */
export const ANDROID_PRODUCT_IDS = {
  // Social tier
  SOCIAL_MONTHLY: `${BUNDLE_ID}.social.monthly`,
  SOCIAL_YEARLY: `${BUNDLE_ID}.social.yearly`,

  // Premium tier
  PREMIUM_MONTHLY: `${BUNDLE_ID}.premium.monthly`,
  PREMIUM_YEARLY: `${BUNDLE_ID}.premium.yearly`,
} as const;

/**
 * Unified product IDs (platform-agnostic)
 * Use these for RevenueCat which handles platform abstraction
 */
export const PRODUCT_IDS = {
  // Social tier products
  SOCIAL_MONTHLY: `${BUNDLE_ID}.social.monthly`,
  SOCIAL_YEARLY: `${BUNDLE_ID}.social.yearly`,

  // Premium tier products
  PREMIUM_MONTHLY: `${BUNDLE_ID}.premium.monthly`,
  PREMIUM_YEARLY: `${BUNDLE_ID}.premium.yearly`,
} as const;

/**
 * All valid product IDs as a flat array
 * Useful for validation
 */
export const ALL_PRODUCT_IDS = Object.values(PRODUCT_IDS);

/**
 * Type representing valid product IDs
 */
export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

// =====================================================
// PRODUCT TO TIER MAPPINGS
// =====================================================

/**
 * Maps product IDs to subscription tiers
 * Used by webhook handlers to determine tier from purchase
 */
export const PRODUCT_ID_TO_TIER: Record<ProductId, SubscriptionTier> = {
  [PRODUCT_IDS.SOCIAL_MONTHLY]: 'social',
  [PRODUCT_IDS.SOCIAL_YEARLY]: 'social',
  [PRODUCT_IDS.PREMIUM_MONTHLY]: 'premium',
  [PRODUCT_IDS.PREMIUM_YEARLY]: 'premium',
};

/**
 * Maps tiers to their available product IDs
 * Used for displaying purchase options
 */
export const TIER_TO_PRODUCT_IDS: Record<
  Exclude<SubscriptionTier, 'free' | 'super_admin'>,
  readonly ProductId[]
> = {
  social: [PRODUCT_IDS.SOCIAL_MONTHLY, PRODUCT_IDS.SOCIAL_YEARLY],
  premium: [PRODUCT_IDS.PREMIUM_MONTHLY, PRODUCT_IDS.PREMIUM_YEARLY],
};

// =====================================================
// BILLING PERIOD HELPERS
// =====================================================

/**
 * Billing period types
 */
export type BillingPeriod = 'monthly' | 'yearly';

/**
 * Extract billing period from product ID
 */
export function getBillingPeriod(productId: string): BillingPeriod | null {
  if (productId.endsWith('.monthly')) return 'monthly';
  if (productId.endsWith('.yearly')) return 'yearly';
  return null;
}

/**
 * Extract tier from product ID
 */
export function getTierFromProductId(productId: string): SubscriptionTier | null {
  const normalizedId = productId as ProductId;
  return PRODUCT_ID_TO_TIER[normalizedId] ?? null;
}

/**
 * Check if a product ID is valid
 */
export function isValidProductId(productId: string): productId is ProductId {
  return ALL_PRODUCT_IDS.includes(productId as ProductId);
}

// =====================================================
// REVENUECAT ENTITLEMENT IDENTIFIERS
// =====================================================

/**
 * RevenueCat entitlement identifiers
 * These are configured in RevenueCat dashboard and grant access to features
 *
 * @see https://docs.revenuecat.com/docs/entitlements
 */
export const ENTITLEMENT_IDS = {
  /** Social tier entitlement */
  SOCIAL: 'social_access',

  /** Premium tier entitlement (includes all social features) */
  PREMIUM: 'premium_access',
} as const;

/**
 * Type representing valid entitlement IDs
 */
export type EntitlementId = (typeof ENTITLEMENT_IDS)[keyof typeof ENTITLEMENT_IDS];

/**
 * Maps entitlement IDs to subscription tiers
 */
export const ENTITLEMENT_TO_TIER: Record<EntitlementId, SubscriptionTier> = {
  [ENTITLEMENT_IDS.SOCIAL]: 'social',
  [ENTITLEMENT_IDS.PREMIUM]: 'premium',
};

// =====================================================
// PRICING CONFIGURATION
// =====================================================

/**
 * Default pricing in AUD (fallback if store prices unavailable)
 * Real prices should be fetched from App Store / RevenueCat
 *
 * Note: Social monthly is $4.99 regular price, currently promotional at $3.99
 */
export const DEFAULT_PRICING_AUD = {
  [PRODUCT_IDS.SOCIAL_MONTHLY]: {
    price: 4.99,
    promotionalPrice: 3.99,
    currency: 'AUD',
    displayPrice: '$4.99/month',
    isPromotional: true,
    promotionalLabel: '$3.99/mo for first 3 months',
  },
  [PRODUCT_IDS.SOCIAL_YEARLY]: {
    price: 39.99,
    currency: 'AUD',
    displayPrice: '$39.99/year',
    savings: '17%', // vs monthly at $3.99
  },
  [PRODUCT_IDS.PREMIUM_MONTHLY]: {
    price: 9.99,
    currency: 'AUD',
    displayPrice: '$9.99/month',
  },
  [PRODUCT_IDS.PREMIUM_YEARLY]: {
    price: 84.99,
    currency: 'AUD',
    displayPrice: '$84.99/year',
    savings: '29%', // vs monthly
  },
} as const;

/**
 * Type for pricing info
 */
export interface ProductPricing {
  price: number;
  regularPrice?: number;
  currency: string;
  displayPrice: string;
  savings?: string;
  isPromotional?: boolean;
  promotionalLabel?: string;
}

/**
 * Free trial duration in days
 */
export const FREE_TRIAL_DAYS = 7;
