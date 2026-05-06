/**
 * Sync Subscription From RevenueCat Edge Function
 *
 * Authoritative sync of a user's subscription from RevenueCat's REST API to
 * the local user_subscriptions table. Called by the app immediately after a
 * successful purchase so the user-facing tier doesn't depend on webhook
 * delivery. The webhook is still authoritative for renewal/cancellation/
 * expiration events that the app can't observe locally.
 *
 * Flow:
 *   1. Verify the caller's Supabase JWT, extract auth.uid().
 *   2. Hit GET https://api.revenuecat.com/v1/subscribers/{auth.uid()}
 *      with the RevenueCat **secret** API key — this is the trusted server
 *      response and cannot be spoofed by the client.
 *   3. Pick the highest active entitlement (premium > social > free).
 *   4. Upsert into user_subscriptions using the service role.
 *   5. Return the resolved tier to the caller.
 *
 * Deploy:
 *   supabase functions deploy sync-subscription-from-revenuecat \
 *     --project-ref <ref>
 *
 * Required Supabase secrets:
 *   REVENUECAT_SECRET_API_KEY  — RC project's "Secret API key"
 *   (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are auto-provided)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// =====================================================
// PRODUCT / ENTITLEMENT MAPPING
// Mirror of src/constants/products.ts so the function is self-contained.
// =====================================================

type SubscriptionTier = 'free' | 'social' | 'premium' | 'enterprise';
type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';

const ENTITLEMENT_TO_TIER: Record<string, SubscriptionTier> = {
  social_access: 'social',
  premium_access: 'premium',
  enterprise_access: 'enterprise',
};

// Tier precedence — highest wins when multiple entitlements are active.
const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  social: 1,
  premium: 2,
  enterprise: 3,
};

// =====================================================
// REVENUECAT REST API TYPES (subset we use)
// https://www.revenuecat.com/docs/api-v1#tag/customers/operation/get-or-create-customer
// =====================================================

interface RcEntitlement {
  expires_date: string | null;
  product_identifier: string;
  purchase_date: string;
}

interface RcSubscription {
  expires_date: string | null;
  purchase_date: string;
  original_purchase_date: string;
  store: string;
  is_sandbox?: boolean;
  unsubscribe_detected_at: string | null;
  billing_issues_detected_at: string | null;
}

interface RcSubscriberResponse {
  subscriber: {
    original_app_user_id: string;
    entitlements: Record<string, RcEntitlement>;
    subscriptions: Record<string, RcSubscription>;
  };
}

// =====================================================
// HANDLER
// =====================================================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const rcSecretKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.error('[sync-sub] Missing Supabase configuration');
    return json({ error: 'Server configuration error' }, 500);
  }
  if (!rcSecretKey) {
    console.error('[sync-sub] REVENUECAT_SECRET_API_KEY not set');
    return json({ error: 'Server configuration error' }, 500);
  }

  // 1. Authenticate caller via their Supabase JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Missing authorization header' }, 401);
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser();

  if (authError || !user) {
    console.warn('[sync-sub] Auth error:', authError?.message);
    return json({ error: 'Unauthorized' }, 401);
  }

  const userId = user.id;
  console.log(`[sync-sub] Syncing for user ${userId}`);

  // 2. Fetch canonical state from RevenueCat REST
  let rc: RcSubscriberResponse;
  try {
    // NB: do NOT send X-Platform here. That header makes RC classify the
    // request as coming from a mobile SDK, which then rejects secret API
    // keys with code 7243 ("Secret API keys should not be used in your
    // app."). Server-side GET /v1/subscribers only needs the bearer token.
    const rcRes = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${rcSecretKey}`,
          Accept: 'application/json',
        },
      }
    );

    if (!rcRes.ok) {
      const text = await rcRes.text();
      console.error(`[sync-sub] RC fetch failed ${rcRes.status}:`, text);
      return json({ error: 'Failed to fetch subscriber from RevenueCat' }, 502);
    }

    rc = (await rcRes.json()) as RcSubscriberResponse;
  } catch (err) {
    console.error('[sync-sub] RC fetch threw:', err);
    return json({ error: 'Failed to reach RevenueCat' }, 502);
  }

  // 3. Resolve highest active entitlement
  const entitlements = rc.subscriber?.entitlements ?? {};
  const subscriptions = rc.subscriber?.subscriptions ?? {};
  const now = Date.now();

  let resolvedTier: SubscriptionTier = 'free';
  let resolvedProductId: string | null = null;
  let resolvedExpiresAt: string | null = null;

  for (const [entId, ent] of Object.entries(entitlements)) {
    const tier = ENTITLEMENT_TO_TIER[entId];
    if (!tier) continue;
    const expiresMs = ent.expires_date ? new Date(ent.expires_date).getTime() : Infinity;
    const isActive = expiresMs > now;
    if (!isActive) continue;
    if (TIER_RANK[tier] > TIER_RANK[resolvedTier]) {
      resolvedTier = tier;
      resolvedProductId = ent.product_identifier;
      resolvedExpiresAt = ent.expires_date;
    }
  }

  // Detect cancellation hint from the corresponding subscription record
  let cancelledAt: string | null = null;
  if (resolvedProductId && subscriptions[resolvedProductId]) {
    cancelledAt = subscriptions[resolvedProductId].unsubscribe_detected_at ?? null;
  }

  console.log(
    `[sync-sub] Resolved user ${userId} -> tier=${resolvedTier}, product=${resolvedProductId}, expires=${resolvedExpiresAt}`
  );

  // 4. If no active paid entitlement, leave the row alone — webhook handles
  //    expirations. We don't want to flap the user back to free here, since
  //    RC may briefly omit a freshly-purchased entitlement during sandbox
  //    propagation. The caller should fall back to its existing local state.
  if (resolvedTier === 'free') {
    return json({ tier: 'free', synced: false });
  }

  // 5. Upsert with service role (bypasses RLS update restriction)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const status: SubscriptionStatus = cancelledAt ? 'cancelled' : 'active';
  const nowIso = new Date().toISOString();

  const { error: upsertError } = await supabaseAdmin.from('user_subscriptions').upsert(
    {
      user_id: userId,
      tier: resolvedTier,
      status,
      source: 'revenuecat',
      external_id: rc.subscriber.original_app_user_id,
      product_id: resolvedProductId,
      started_at: nowIso,
      expires_at: resolvedExpiresAt,
      cancelled_at: cancelledAt,
      trial_started_at: null,
      trial_ends_at: null,
      updated_at: nowIso,
    },
    { onConflict: 'user_id' }
  );

  if (upsertError) {
    console.error('[sync-sub] Upsert error:', upsertError);
    return json({ error: 'Failed to update subscription' }, 500);
  }

  return json({
    tier: resolvedTier,
    productId: resolvedProductId,
    expiresAt: resolvedExpiresAt,
    status,
    synced: true,
  });
});
