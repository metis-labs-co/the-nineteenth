/**
 * RevenueCat Webhook Handler for The Nineteenth
 *
 * This Supabase Edge Function handles incoming webhooks from RevenueCat
 * to sync subscription state from App Store to our database.
 *
 * Webhook Setup:
 * 1. Deploy this function: supabase functions deploy revenuecat-webhook --no-verify-jwt
 * 2. Configure webhook in RevenueCat dashboard (Integrations → Webhooks):
 *    - URL: https://<your-project>.supabase.co/functions/v1/revenuecat-webhook
 *    - Set Authorization header value (this is sent as the HTTP Authorization header)
 * 3. Set the same value as a Supabase secret:
 *    supabase secrets set REVENUECAT_WEBHOOK_SECRET=<same-value-as-revenuecat>
 *
 * @see https://docs.revenuecat.com/docs/webhooks
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  isLifetimeProduct,
  mapProductToTier,
  PRODUCT_ID_TO_TIER,
  type SubscriptionStatus,
  type SubscriptionTier,
} from '../_shared/subscriptions.ts';

// =====================================================
// TYPES
// =====================================================

type RevenueCatEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'PRODUCT_CHANGE'
  | 'UNCANCELLATION'
  | 'NON_RENEWING_PURCHASE'
  | 'SUBSCRIBER_ALIAS'
  | 'TRANSFER'
  | 'TEST';

export interface RevenueCatWebhookEvent {
  api_version: string;
  event: {
    id: string;
    type: RevenueCatEventType;
    app_user_id: string;
    original_app_user_id: string;
    aliases: string[];
    product_id: string;
    period_type: 'TRIAL' | 'INTRO' | 'NORMAL' | 'PROMOTIONAL';
    purchased_at_ms: number;
    expiration_at_ms: number | null;
    environment: 'SANDBOX' | 'PRODUCTION';
    entitlement_id: string | null;
    entitlement_ids: string[];
    presented_offering_id: string | null;
    transaction_id: string;
    original_transaction_id: string;
    is_family_share: boolean;
    store: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'PROMOTIONAL';
    takehome_percentage: number;
    price: number | null;
    currency: string | null;
    cancel_reason?: string;
    grace_period_expiration_at_ms?: number;
  };
}

interface WebhookResult {
  success: boolean;
  message: string;
  error?: string;
  userId?: string;
  tier?: SubscriptionTier;
}

/**
 * Minimal structural type for the exact Supabase surface the webhook uses.
 * Declared explicitly (rather than `ReturnType<typeof createClient>`) because an
 * untyped v2 client resolves upsert/update payloads to `never`; this also lets
 * tests supply a lightweight mock. The real client is cast to it at the boundary.
 */
type DbResult = { error: { message: string } | null };
type DbSelectResult = { data: Array<Record<string, unknown>> | null; error: { message: string } | null };
interface SupabaseLike {
  from(table: string): {
    upsert(row: Record<string, unknown>, opts?: { onConflict?: string }): Promise<DbResult>;
    update(patch: Record<string, unknown>): {
      eq(col: string, val: unknown): {
        select(cols: string): Promise<DbSelectResult>;
      };
    };
  };
}

// Product→tier mapping, tier types, and lifetime detection now live in
// ../_shared/subscriptions.ts (single source of truth, includes enterprise).

// =====================================================
// AUTHORIZATION VERIFICATION
// =====================================================

function verifyAuthorization(
  authHeader: string | null,
  secret: string
): boolean {
  if (!authHeader || !secret) {
    console.warn('[Webhook] Missing Authorization header or secret');
    return false;
  }

  // RevenueCat sends the Authorization header value exactly as configured
  // in their dashboard. Use timing-safe comparison.
  if (authHeader.length !== secret.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < authHeader.length; i++) {
    result |= authHeader.charCodeAt(i) ^ secret.charCodeAt(i);
  }

  return result === 0;
}

// =====================================================
// DATABASE OPERATIONS
// =====================================================

/**
 * Full subscription row written by *purchase* events that establish or replace
 * a subscription (INITIAL_PURCHASE, NON_RENEWING_PURCHASE). Every column is
 * supplied by the caller — this row is authoritative.
 */
interface SubscriptionRow {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  external_id: string | null;
  product_id: string | null;
  started_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
}

/**
 * Partial update written by *lifecycle* events (RENEWAL, CANCELLATION,
 * UNCANCELLATION, EXPIRATION, PRODUCT_CHANGE). Only the columns present here are
 * written; everything else (tier, product, external_id, started_at, trial dates)
 * is preserved. `started_at` is deliberately not patchable — the original start
 * date must never move.
 */
type SubscriptionPatch = Partial<Omit<SubscriptionRow, 'started_at'>>;

/**
 * Create-or-replace the full subscription row. Use ONLY for purchase events that
 * carry complete state; lifecycle events must use {@link patchSubscription} so
 * they don't wipe tier/product/external_id.
 */
async function upsertSubscription(
  supabase: SupabaseLike,
  userId: string,
  row: SubscriptionRow
): Promise<WebhookResult> {
  if (!userId) {
    return { success: false, message: 'User ID is required', error: 'INVALID_USER_ID' };
  }

  try {
    const { error } = await supabase.from('user_subscriptions').upsert(
      {
        user_id: userId,
        source: 'revenuecat',
        ...row,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('[Webhook] Upsert subscription error:', error);
      return { success: false, message: 'Failed to update subscription', error: error.message, userId };
    }

    console.log(`[Webhook] Upserted subscription for user ${userId}:`, row);
    return { success: true, message: 'Subscription updated successfully', userId, tier: row.tier };
  } catch (err) {
    console.error('[Webhook] Unexpected error:', err);
    return {
      success: false,
      message: 'An unexpected error occurred',
      error: err instanceof Error ? err.message : 'Unknown error',
      userId,
    };
  }
}

/**
 * Patch specific columns on an existing subscription without touching the rest.
 * Used by lifecycle events so that turning off auto-renew (etc.) keeps the user's
 * tier, product, and original start date intact.
 *
 * If no row exists yet (a lifecycle event arriving before the purchase that
 * created it — rare, out-of-order delivery), we log and acknowledge rather than
 * fail: returning an error would trigger a RevenueCat retry storm, and the
 * missing purchase event will establish the row when it arrives.
 */
async function patchSubscription(
  supabase: SupabaseLike,
  userId: string,
  patch: SubscriptionPatch
): Promise<WebhookResult> {
  if (!userId) {
    return { success: false, message: 'User ID is required', error: 'INVALID_USER_ID' };
  }

  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select('user_id');

    if (error) {
      console.error('[Webhook] Patch subscription error:', error);
      return { success: false, message: 'Failed to update subscription', error: error.message, userId };
    }

    if (!data || data.length === 0) {
      console.warn(
        `[Webhook] No existing subscription to patch for user ${userId} — acknowledging (out-of-order event?)`
      );
      return { success: true, message: 'No existing subscription to patch', userId };
    }

    console.log(`[Webhook] Patched subscription for user ${userId}:`, patch);
    return { success: true, message: 'Subscription updated successfully', userId, tier: patch.tier };
  } catch (err) {
    console.error('[Webhook] Unexpected error:', err);
    return {
      success: false,
      message: 'An unexpected error occurred',
      error: err instanceof Error ? err.message : 'Unknown error',
      userId,
    };
  }
}

// =====================================================
// EVENT HANDLERS
// =====================================================

export async function handleInitialPurchase(
  supabase: SupabaseLike,
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookResult> {
  const tier = mapProductToTier(event.product_id);
  const isTrial = event.period_type === 'TRIAL';

  // Purchase event: establishes the full subscription row.
  return upsertSubscription(supabase, event.app_user_id, {
    tier,
    status: isTrial ? 'trial' : 'active',
    external_id: event.original_transaction_id,
    product_id: event.product_id,
    started_at: new Date(event.purchased_at_ms).toISOString(),
    expires_at: event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null,
    cancelled_at: null,
    trial_started_at: isTrial
      ? new Date(event.purchased_at_ms).toISOString()
      : null,
    trial_ends_at: isTrial && event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null,
  });
}

export async function handleNonRenewingPurchase(
  supabase: SupabaseLike,
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookResult> {
  if (!(event.product_id in PRODUCT_ID_TO_TIER)) {
    console.warn(`[Webhook] NON_RENEWING_PURCHASE: unknown product_id "${event.product_id}" — ignoring`);
    return {
      success: true,
      message: 'Unknown product, no action taken',
      userId: event.app_user_id,
    };
  }

  const tier = mapProductToTier(event.product_id);

  // One-time lifetime purchase: establishes the full row, never expires.
  return upsertSubscription(supabase, event.app_user_id, {
    tier,
    status: 'active',
    external_id: event.original_transaction_id,
    product_id: event.product_id,
    started_at: new Date(event.purchased_at_ms).toISOString(),
    expires_at: null,
    cancelled_at: null,
    trial_started_at: null,
    trial_ends_at: null,
  });
}

export async function handleRenewal(
  supabase: SupabaseLike,
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookResult> {
  const tier = mapProductToTier(event.product_id);

  // Lifecycle event: extend access. Patch only — must not reset external_id,
  // started_at, or trial dates.
  return patchSubscription(supabase, event.app_user_id, {
    tier,
    status: 'active',
    product_id: event.product_id,
    expires_at: event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null,
    cancelled_at: null,
  });
}

export async function handleCancellation(
  supabase: SupabaseLike,
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookResult> {
  // Refund/cancellation of a one-time lifetime purchase: revoke access now.
  if (isLifetimeProduct(event.product_id)) {
    const now = new Date().toISOString();
    return patchSubscription(supabase, event.app_user_id, {
      tier: 'free',
      status: 'expired',
      product_id: null,
      external_id: null,
      expires_at: now,
      cancelled_at: now,
    });
  }

  // Auto-renewing sub: user turned off renewal but keeps access + tier until
  // expiry. Patch only status/cancelled_at/expires_at — preserve tier & product.
  return patchSubscription(supabase, event.app_user_id, {
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    expires_at: event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null,
  });
}

export async function handleExpiration(
  supabase: SupabaseLike,
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookResult> {
  // Non-consumables don't normally expire; never revoke a lifetime grant on EXPIRATION.
  if (isLifetimeProduct(event.product_id)) {
    console.warn(`[Webhook] EXPIRATION received for lifetime product "${event.product_id}" — ignoring`);
    return {
      success: true,
      message: 'Lifetime product EXPIRATION ignored',
      userId: event.app_user_id,
    };
  }

  // Access truly ended: drop to free. Patch preserves product_id/external_id for
  // history/re-subscribe correlation.
  return patchSubscription(supabase, event.app_user_id, {
    tier: 'free',
    status: 'expired',
    expires_at: event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : new Date().toISOString(),
  });
}

export async function handleProductChange(
  supabase: SupabaseLike,
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookResult> {
  const tier = mapProductToTier(event.product_id);

  // Upgrade/downgrade: patch tier + product, keep external_id & started_at.
  return patchSubscription(supabase, event.app_user_id, {
    tier,
    status: 'active',
    product_id: event.product_id,
    expires_at: event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null,
  });
}

export async function handleUncancellation(
  supabase: SupabaseLike,
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookResult> {
  // Re-enabled auto-renew: only clear the cancellation. Tier/product untouched.
  return patchSubscription(supabase, event.app_user_id, {
    status: 'active',
    cancelled_at: null,
  });
}

// =====================================================
// MAIN HANDLER
// =====================================================

export async function handleWebhook(
  supabase: SupabaseLike,
  payload: RevenueCatWebhookEvent
): Promise<WebhookResult> {
  const { event } = payload;

  console.log(
    `[Webhook] Received ${event.type} for user ${event.app_user_id} ` +
      `(product: ${event.product_id}, env: ${event.environment})`
  );

  switch (event.type) {
    case 'INITIAL_PURCHASE':
      return handleInitialPurchase(supabase, event);

    case 'RENEWAL':
      return handleRenewal(supabase, event);

    case 'CANCELLATION':
      return handleCancellation(supabase, event);

    case 'EXPIRATION':
      return handleExpiration(supabase, event);

    case 'PRODUCT_CHANGE':
      return handleProductChange(supabase, event);

    case 'UNCANCELLATION':
      return handleUncancellation(supabase, event);

    case 'BILLING_ISSUE':
      console.log(`[Webhook] Billing issue for user ${event.app_user_id}`);
      return {
        success: true,
        message: 'Billing issue noted',
        userId: event.app_user_id,
      };

    case 'TEST':
      // Sent by the "Send test event" button in the RevenueCat dashboard.
      // Has fake app_user_id and no real transaction; just confirm receipt.
      console.log('[Webhook] TEST event received — connectivity confirmed');
      return {
        success: true,
        message: 'Test event acknowledged',
      };

    case 'NON_RENEWING_PURCHASE':
      return handleNonRenewingPurchase(supabase, event);

    case 'SUBSCRIBER_ALIAS':
    case 'TRANSFER':
      console.log(`[Webhook] Event ${event.type} acknowledged`);
      return {
        success: true,
        message: `Event ${event.type} acknowledged`,
        userId: event.app_user_id,
      };

    default:
      // Acknowledge (HTTP 200) unknown/unhandled event types. Returning a
      // failure here yields HTTP 500, which RevenueCat retries indefinitely —
      // a new event type we don't handle would cause a permanent retry storm.
      console.warn(`[Webhook] Unhandled event type: ${event.type} — acknowledging`);
      return {
        success: true,
        message: `Unhandled event type acknowledged: ${event.type}`,
        userId: event.app_user_id,
      };
  }
}

// =====================================================
// SERVER
// =====================================================

export async function handleRequest(req: Request): Promise<Response> {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Webhook] Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Read request body
    const body = await req.text();

    // This function deliberately bypasses Supabase's JWT gateway because
    // RevenueCat sends a configured static Authorization value. Never fall
    // back to unauthenticated processing when the server secret is missing.
    if (!webhookSecret) {
      console.error('[Webhook] REVENUECAT_WEBHOOK_SECRET is not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!verifyAuthorization(authHeader, webhookSecret)) {
      console.warn('[Webhook] Invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse webhook payload
    const payload: RevenueCatWebhookEvent = JSON.parse(body);

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Process the webhook event (cast the strict v2 client to our minimal surface)
    const result = await handleWebhook(supabase as unknown as SupabaseLike, payload);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[Webhook] Error processing request:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Only start the HTTP server when run as the entrypoint, so tests can import the
// handlers without spinning up a listener.
if (import.meta.main) {
  serve(handleRequest);
}
