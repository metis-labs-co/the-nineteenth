/**
 * Shared subscription types + product→tier mapping for Supabase Edge Functions.
 *
 * Single source of truth for edge functions so the RevenueCat webhook (and any
 * future functions) don't re-declare a drifted copy. Deno cannot import from the
 * app's `src/` (path aliases / bundler-only), so this mirrors
 * `src/constants/products.ts` + `src/types/subscription.types.ts`. Keep the tier
 * list and product IDs in sync with those files.
 */

/** Mirror of the app + DB `subscription_tier` enum (see migration 20260421000000). */
export type SubscriptionTier =
  | 'free'
  | 'social'
  | 'premium'
  | 'enterprise'
  | 'super_admin'
  | 'developer';

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';

/**
 * Product ID → tier. Mirrors `PRODUCT_ID_TO_TIER` in `src/constants/products.ts`.
 * Enterprise is B2B/manual, so it has monthly/yearly but no self-serve lifetime.
 */
export const PRODUCT_ID_TO_TIER: Record<string, SubscriptionTier> = {
  'the.nineteenth.social.monthly': 'social',
  'the.nineteenth.social.yearly': 'social',
  'the.nineteenth.social.lifetime': 'social',
  'the.nineteenth.premium.monthly': 'premium',
  'the.nineteenth.premium.yearly': 'premium',
  'the.nineteenth.premium.lifetime': 'premium',
  'the.nineteenth.enterprise.monthly': 'enterprise',
  'the.nineteenth.enterprise.yearly': 'enterprise',
};

export function isLifetimeProduct(productId: string): boolean {
  return productId.endsWith('.lifetime') && productId in PRODUCT_ID_TO_TIER;
}

/**
 * Resolve a tier from a product ID. Prefers the exact mapping, then a substring
 * fallback (defensive against RevenueCat prefix/suffix quirks), then warns.
 */
export function mapProductToTier(productId: string): SubscriptionTier {
  if (productId in PRODUCT_ID_TO_TIER) {
    return PRODUCT_ID_TO_TIER[productId];
  }

  // Pattern-matching fallback (order matters: most-privileged first).
  if (productId.includes('enterprise')) return 'enterprise';
  if (productId.includes('premium')) return 'premium';
  if (productId.includes('social')) return 'social';

  console.warn(`[Webhook] Unknown product ID: ${productId}, defaulting to 'free'`);
  return 'free';
}
