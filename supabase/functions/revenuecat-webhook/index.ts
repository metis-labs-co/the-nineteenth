/**
 * RevenueCat Webhook Handler for The Nineteenth
 *
 * This Supabase Edge Function handles incoming webhooks from RevenueCat
 * to sync subscription state from App Store to our database.
 *
 * Webhook Setup:
 * 1. Deploy this function: supabase functions deploy revenuecat-webhook --no-verify-jwt
 * 2. Configure webhook URL in RevenueCat dashboard:
 *    https://<your-project>.supabase.co/functions/v1/revenuecat-webhook
 * 3. Set REVENUECAT_WEBHOOK_SECRET in Supabase secrets:
 *    supabase secrets set REVENUECAT_WEBHOOK_SECRET=your_secret
 *
 * @see https://docs.revenuecat.com/docs/webhooks
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac, timingSafeEqual } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

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
  | 'TRANSFER';

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
  'com.thenineteenth.social.monthly': 'social',
  'com.thenineteenth.social.yearly': 'social',
  'com.thenineteenth.premium.monthly': 'premium',
  'com.thenineteenth.premium.yearly': 'premium',
};

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
// SIGNATURE VERIFICATION
// =====================================================

async function verifySignature(
  body: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) {
    console.warn('[Webhook] Missing signature or secret');
    return false;
  }

  try {
    // RevenueCat uses HMAC-SHA256 for webhook signatures
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    );

    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Timing-safe comparison
    if (signature.length !== expectedSignature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }

    return result === 0;
  } catch (err) {
    console.error('[Webhook] Signature verification error:', err);
    return false;
  }
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
        trial_started_at: null,
        trial_ends_at: null,
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

  return updateSubscription(supabase, event.app_user_id, {
    tier,
    status: event.period_type === 'TRIAL' ? 'trial' : 'active',
    external_id: event.original_transaction_id,
    product_id: event.product_id,
    expires_at: event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null,
    cancelled_at: null,
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
  });
}

async function handleCancellation(
  supabase: ReturnType<typeof createClient>,
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookResult> {
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

    case 'NON_RENEWING_PURCHASE':
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

    // Verify webhook signature (if secret is configured)
    if (webhookSecret) {
      const signature = req.headers.get('x-revenuecat-signature');

      if (!(await verifySignature(body, signature, webhookSecret))) {
        console.warn('[Webhook] Invalid signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.warn(
        '[Webhook] REVENUECAT_WEBHOOK_SECRET not configured - skipping signature verification'
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
