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

interface RevenueCatWebhookEvent {
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

type SubscriptionTier = 'free' | 'social' | 'premium' | 'super_admin';
type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';

interface WebhookResult {
  success: boolean;
  message: string;
  error?: string;
  userId?: string;
  tier?: SubscriptionTier;
}

// =====================================================
// PRODUCT MAPPING
// =====================================================

const PRODUCT_ID_TO_TIER: Record<string, SubscriptionTier> = {
  'the.nineteenth.social.monthly': 'social',
  'the.nineteenth.social.yearly': 'social',
  'the.nineteenth.social.lifetime': 'social',
  'the.nineteenth.premium.monthly': 'premium',
  'the.nineteenth.premium.yearly': 'premium',
  'the.nineteenth.premium.lifetime': 'premium',
};

function isLifetimeProduct(productId: string): boolean {
  return productId.endsWith('.lifetime') && productId in PRODUCT_ID_TO_TIER;
}

function mapProductToTier(productId: string): SubscriptionTier {
  // Direct lookup
  if (productId in PRODUCT_ID_TO_TIER) {
    return PRODUCT_ID_TO_TIER[productId];
  }

  // Pattern matching fallback
  if (productId.includes('premium')) return 'premium';
  if (productId.includes('social')) return 'social';

  console.warn(`[Webhook] Unknown product ID: ${productId}, defaulting to 'free'`);
  return 'free';
}

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

async function updateSubscription(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  updates: {
    tier?: SubscriptionTier;
    status?: SubscriptionStatus;
    external_id?: string;
    product_id?: string;
    expires_at?: string | null;
    cancelled_at?: string | null;
    trial_started_at?: string | null;
    trial_ends_at?: string | null;
  }
): Promise<WebhookResult> {
  if (!userId) {
    return {
      success: false,
      message: 'User ID is required',
      error: 'INVALID_USER_ID',
    };
  }

  try {
    const now = new Date().toISOString();

    // Use upsert to handle both new and existing subscriptions
    const { error } = await supabase.from('user_subscriptions').upsert(
      {
        user_id: userId,
        tier: updates.tier ?? 'free',
        status: updates.status ?? 'active',
        source: 'revenuecat',
        external_id: updates.external_id ?? null,
        product_id: updates.product_id ?? null,
        started_at: now,
        expires_at: updates.expires_at ?? null,
        cancelled_at: updates.cancelled_at ?? null,
        trial_started_at: updates.trial_started_at ?? null,
        trial_ends_at: updates.trial_ends_at ?? null,
        updated_at: now,
      },
      {
        onConflict: 'user_id',
      }
    );

    if (error) {
      console.error('[Webhook] Update subscription error:', error);
      return {
        success: false,
        message: 'Failed to update subscription',
        error: error.message,
        userId,
      };
    }

    console.log(`[Webhook] Updated subscription for user ${userId}:`, updates);
    return {
      success: true,
      message: 'Subscription updated successfully',
      userId,
      tier: updates.tier,
    };
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

async function handleInitialPurchase(
  supabase: ReturnType<typeof createClient>,
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookResult> {
  const tier = mapProductToTier(event.product_id);
  const isTrial = event.period_type === 'TRIAL';

  return updateSubscription(supabase, event.app_user_id, {
    tier,
    status: isTrial ? 'trial' : 'active',
    external_id: event.original_transaction_id,
    product_id: event.product_id,
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

async function handleNonRenewingPurchase(
  supabase: ReturnType<typeof createClient>,
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

  // One-time lifetime purchase: never expires.
  return updateSubscription(supabase, event.app_user_id, {
    tier,
    status: 'active',
    external_id: event.original_transaction_id,
    product_id: event.product_id,
    expires_at: null,
    cancelled_at: null,
    trial_started_at: null,
    trial_ends_at: null,
  });
}

async function handleRenewal(
  supabase: ReturnType<typeof createClient>,
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookResult> {
  const tier = mapProductToTier(event.product_id);

  return updateSubscription(supabase, event.app_user_id, {
    tier,
    status: 'active',
    product_id: event.product_id,
    expires_at: event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null,
    cancelled_at: null,
    trial_started_at: null,
    trial_ends_at: null,
  });
}

async function handleCancellation(
  supabase: ReturnType<typeof createClient>,
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookResult> {
  // Refund/cancellation of a one-time lifetime purchase: revoke access now.
  if (isLifetimeProduct(event.product_id)) {
    const now = new Date().toISOString();
    return updateSubscription(supabase, event.app_user_id, {
      tier: 'free',
      status: 'expired',
      expires_at: now,
      cancelled_at: now,
    });
  }

  // Auto-renewing sub: user turned off renewal but keeps access until expiry.
  return updateSubscription(supabase, event.app_user_id, {
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    expires_at: event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null,
  });
}

async function handleExpiration(
  supabase: ReturnType<typeof createClient>,
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

  return updateSubscription(supabase, event.app_user_id, {
    tier: 'free',
    status: 'expired',
    expires_at: event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : new Date().toISOString(),
  });
}

async function handleProductChange(
  supabase: ReturnType<typeof createClient>,
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookResult> {
  const tier = mapProductToTier(event.product_id);

  return updateSubscription(supabase, event.app_user_id, {
    tier,
    status: 'active',
    product_id: event.product_id,
    expires_at: event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null,
  });
}

async function handleUncancellation(
  supabase: ReturnType<typeof createClient>,
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookResult> {
  return updateSubscription(supabase, event.app_user_id, {
    status: 'active',
    cancelled_at: null,
  });
}

// =====================================================
// MAIN HANDLER
// =====================================================

async function handleWebhook(
  supabase: ReturnType<typeof createClient>,
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
      console.warn(`[Webhook] Unknown event type: ${event.type}`);
      return {
        success: false,
        message: `Unknown event type: ${event.type}`,
        error: 'UNKNOWN_EVENT_TYPE',
      };
  }
}

// =====================================================
// SERVER
// =====================================================

serve(async (req: Request) => {
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

    // Verify Authorization header (if secret is configured)
    // RevenueCat sends the value set in their dashboard as the Authorization header
    if (webhookSecret) {
      const authHeader = req.headers.get('Authorization');

      if (!verifyAuthorization(authHeader, webhookSecret)) {
        console.warn('[Webhook] Invalid Authorization header');
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.warn(
        '[Webhook] REVENUECAT_WEBHOOK_SECRET not configured - skipping authorization check'
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

    // Process the webhook event
    const result = await handleWebhook(supabase, payload);

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
});
