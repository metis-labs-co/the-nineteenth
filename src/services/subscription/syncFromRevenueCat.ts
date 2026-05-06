/**
 * syncSubscriptionFromRevenueCat
 *
 * Calls the `sync-subscription-from-revenuecat` Edge Function to write the
 * authoritative tier/state from RevenueCat into our user_subscriptions table.
 * Used immediately after a successful purchase so the UI doesn't depend on
 * webhook delivery for the user-facing experience.
 *
 * The Edge Function:
 *   - Verifies the caller's Supabase JWT (auth.uid())
 *   - Fetches canonical state from RevenueCat REST (server-trusted)
 *   - Upserts user_subscriptions with service role
 *   - Returns the resolved tier
 *
 * Failures here are non-fatal — the webhook is still configured to fire
 * eventually and we don't want a transient sync failure to undo a real
 * purchase. The caller should log and proceed.
 */

import { supabase } from '@/services/supabase/client';
import type { SubscriptionTier } from '@/types/subscription.types';

export interface SyncSubscriptionResult {
  tier: SubscriptionTier;
  productId?: string | null;
  expiresAt?: string | null;
  status?: 'active' | 'cancelled' | 'expired' | 'trial';
  synced: boolean;
}

export async function syncSubscriptionFromRevenueCat(): Promise<
  SyncSubscriptionResult | null
> {
  try {
    const { data, error } = await supabase.functions.invoke<SyncSubscriptionResult>(
      'sync-subscription-from-revenuecat',
      { method: 'POST' }
    );

    if (error) {
      console.warn('[syncSubscriptionFromRevenueCat] invoke error:', error.message);
      return null;
    }
    if (!data) {
      console.warn('[syncSubscriptionFromRevenueCat] no data returned');
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[syncSubscriptionFromRevenueCat] unexpected error:', err);
    return null;
  }
}
