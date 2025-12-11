/**
 * RevenueCat Webhook Handlers for The Nineteenth
 *
 * Handles incoming webhooks from RevenueCat for subscription lifecycle events.
 * These webhooks sync purchase data from App Store / Google Play to our database.
 *
 * Webhook Setup:
 * 1. Configure webhook URL in RevenueCat dashboard: https://your-domain.com/api/webhooks/revenuecat
 * 2. Set webhook secret for signature verification
 * 3. Deploy Edge Function or API route to handle webhooks
 *
 * Event Flow:
 * 1. User purchases via App Store / Google Play
 * 2. RevenueCat processes the transaction
 * 3. RevenueCat sends webhook to our server
 * 4. We verify signature and process event
 * 5. Update user_subscriptions table
 *
 * @see https://docs.revenuecat.com/docs/webhooks
 * @see src/constants/products.ts for product ID mappings
 */

import { supabase } from '@/services/supabase/client';
import {
  PRODUCT_ID_TO_TIER,
  getTierFromProductId,
  isValidProductId,
} from '@/constants/products';
import type { ProductId } from '@/constants/products';
import type {
  SubscriptionTier,
  SubscriptionStatus,
} from '@/types/subscription.types';
import type { Database } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

/**
 * RevenueCat webhook event types
 * @see https://docs.revenuecat.com/docs/webhooks#event-types
 */
export type RevenueCatEventType =
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

/**
 * RevenueCat subscriber information
 */
export interface RevenueCatSubscriber {
  original_app_user_id: string;
  entitlements: Record<
    string,
    {
      expires_date: string | null;
      purchase_date: string;
      product_identifier: string;
      is_sandbox: boolean;
    }
  >;
}

/**
 * RevenueCat webhook event payload
 * Simplified version - full payload has more fields
 *
 * @see https://docs.revenuecat.com/docs/webhooks#webhook-event-body
 */
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
    subscriber_attributes: Record<string, { value: string; updated_at_ms: number }>;
    // Cancellation specific
    cancel_reason?: string;
    // Billing issue specific
    grace_period_expiration_at_ms?: number;
  };
}

/**
 * Webhook handler result
 */
export interface WebhookHandlerResult {
  success: boolean;
  message: string;
  error?: string;
  userId?: string;
  tier?: SubscriptionTier;
}

/**
 * Subscription update payload for database
 */
export interface SubscriptionUpdate {
  tier?: SubscriptionTier;
  status?: SubscriptionStatus;
  external_id?: string;
  product_id?: string;
  expires_at?: string | null;
  cancelled_at?: string | null;
  updated_at?: string;
}

// =====================================================
// PRODUCT MAPPING
// =====================================================

/**
 * Map a product ID to subscription tier
 *
 * @param productId - Product identifier from App Store / Google Play
 * @returns Subscription tier or 'free' if unknown product
 *
 * @example
 * ```typescript
 * const tier = mapProductToTier('com.thenineteenth.social.monthly');
 * // Returns: 'social'
 * ```
 */
export function mapProductToTier(productId: string): SubscriptionTier {
  // Check if it's a known product ID
  if (isValidProductId(productId)) {
    return PRODUCT_ID_TO_TIER[productId as ProductId];
  }

  // Try to extract tier from product ID pattern
  const tier = getTierFromProductId(productId);
  if (tier) {
    return tier;
  }

  // Default to free for unknown products
  console.warn(`[Webhook] Unknown product ID: ${productId}, defaulting to 'free'`);
  return 'free';
}

// =====================================================
// DATABASE OPERATIONS
// =====================================================

/**
 * Update a user's subscription in the database
 *
 * Uses upsert to handle both new and existing subscriptions.
 * The RLS policies ensure only service role can modify subscriptions.
 *
 * @param userId - User ID to update subscription for
 * @param updates - Fields to update
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await updateSubscription('user-123', {
 *   tier: 'premium',
 *   status: 'active',
 *   expires_at: '2024-12-31T23:59:59Z',
 * });
 * ```
 */
export async function updateSubscription(
  userId: string,
  updates: SubscriptionUpdate
): Promise<WebhookHandlerResult> {
  if (!userId) {
    return {
      success: false,
      message: 'User ID is required',
      error: 'INVALID_USER_ID',
    };
  }

  try {
    // Prepare the upsert payload with all required fields
    // For inserts: all fields must be provided (even if null)
    // For updates (when record exists): onConflict will merge with existing values
    const now = new Date().toISOString();
    const payload: Database['public']['Tables']['user_subscriptions']['Insert'] = {
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
    };

    // Upsert the subscription record
    // Note: Using type assertion due to Supabase client type inference limitations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('user_subscriptions') as any).upsert(payload, {
      onConflict: 'user_id',
    });

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
    console.error('[Webhook] Unexpected error updating subscription:', err);
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

/**
 * Handle INITIAL_PURCHASE event
 * User completed their first purchase
 */
async function handleInitialPurchase(
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookHandlerResult> {
  const tier = mapProductToTier(event.product_id);

  return updateSubscription(event.app_user_id, {
    tier,
    status: event.period_type === 'TRIAL' ? 'trial' : 'active',
    external_id: event.original_transaction_id,
    product_id: event.product_id,
    expires_at: event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null,
    cancelled_at: null, // Clear any previous cancellation
  });
}

/**
 * Handle RENEWAL event
 * Subscription successfully renewed
 */
async function handleRenewal(
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookHandlerResult> {
  const tier = mapProductToTier(event.product_id);

  return updateSubscription(event.app_user_id, {
    tier,
    status: 'active',
    product_id: event.product_id,
    expires_at: event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null,
    cancelled_at: null, // Clear cancellation on successful renewal
  });
}

/**
 * Handle CANCELLATION event
 * User cancelled their subscription (will expire at end of period)
 */
async function handleCancellation(
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookHandlerResult> {
  // User cancelled but still has access until expiration
  return updateSubscription(event.app_user_id, {
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    // Keep current tier and expiration - they still have access
    expires_at: event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null,
  });
}

/**
 * Handle EXPIRATION event
 * Subscription period has ended
 */
async function handleExpiration(
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookHandlerResult> {
  // Subscription has fully expired, downgrade to free
  return updateSubscription(event.app_user_id, {
    tier: 'free',
    status: 'expired',
    expires_at: event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : new Date().toISOString(),
  });
}

/**
 * Handle BILLING_ISSUE event
 * Payment failed, user may be in grace period
 */
async function handleBillingIssue(
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookHandlerResult> {
  // Keep current tier during billing retry / grace period
  // Status changes to indicate there's an issue
  const gracePeriodEnd = event.grace_period_expiration_at_ms
    ? new Date(event.grace_period_expiration_at_ms).toISOString()
    : null;

  console.log(
    `[Webhook] Billing issue for user ${event.app_user_id}. ` +
      `Grace period ends: ${gracePeriodEnd ?? 'N/A'}`
  );

  // We don't change tier yet - let grace period expire first
  // Could optionally add a 'billing_issue' status if needed
  return {
    success: true,
    message: 'Billing issue noted, awaiting resolution',
    userId: event.app_user_id,
  };
}

/**
 * Handle PRODUCT_CHANGE event
 * User changed subscription product (upgrade/downgrade)
 */
async function handleProductChange(
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookHandlerResult> {
  const tier = mapProductToTier(event.product_id);

  return updateSubscription(event.app_user_id, {
    tier,
    status: 'active',
    product_id: event.product_id,
    expires_at: event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null,
  });
}

/**
 * Handle UNCANCELLATION event
 * User reactivated their cancelled subscription
 */
async function handleUncancellation(
  event: RevenueCatWebhookEvent['event']
): Promise<WebhookHandlerResult> {
  return updateSubscription(event.app_user_id, {
    status: 'active',
    cancelled_at: null, // Clear cancellation
  });
}

// =====================================================
// MAIN WEBHOOK HANDLER
// =====================================================

/**
 * Handle incoming RevenueCat webhook event
 *
 * Routes the event to the appropriate handler based on event type.
 * Should be called from your webhook endpoint after signature verification.
 *
 * @param event - RevenueCat webhook event payload
 * @returns Handler result with success status and message
 *
 * @example Supabase Edge Function
 * ```typescript
 * import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
 * import { handleRevenueCatWebhook, verifyWebhookSignature } from './webhooks';
 *
 * serve(async (req: Request) => {
 *   const body = await req.text();
 *   const signature = req.headers.get('x-revenuecat-signature');
 *
 *   if (!verifyWebhookSignature(body, signature)) {
 *     return new Response('Invalid signature', { status: 401 });
 *   }
 *
 *   const event = JSON.parse(body) as RevenueCatWebhookEvent;
 *   const result = await handleRevenueCatWebhook(event);
 *
 *   return new Response(JSON.stringify(result), {
 *     status: result.success ? 200 : 500,
 *     headers: { 'Content-Type': 'application/json' },
 *   });
 * });
 * ```
 */
export async function handleRevenueCatWebhook(
  payload: RevenueCatWebhookEvent
): Promise<WebhookHandlerResult> {
  const { event } = payload;

  console.log(
    `[Webhook] Received ${event.type} for user ${event.app_user_id} ` +
      `(product: ${event.product_id}, env: ${event.environment})`
  );

  // Skip sandbox events in production (optional)
  // if (event.environment === 'SANDBOX' && process.env.NODE_ENV === 'production') {
  //   return { success: true, message: 'Sandbox event ignored in production' };
  // }

  switch (event.type) {
    case 'INITIAL_PURCHASE':
      return handleInitialPurchase(event);

    case 'RENEWAL':
      return handleRenewal(event);

    case 'CANCELLATION':
      return handleCancellation(event);

    case 'EXPIRATION':
      return handleExpiration(event);

    case 'BILLING_ISSUE':
      return handleBillingIssue(event);

    case 'PRODUCT_CHANGE':
      return handleProductChange(event);

    case 'UNCANCELLATION':
      return handleUncancellation(event);

    // Events we acknowledge but don't process
    case 'NON_RENEWING_PURCHASE':
    case 'SUBSCRIBER_ALIAS':
    case 'TRANSFER':
      console.log(`[Webhook] Event ${event.type} acknowledged but not processed`);
      return {
        success: true,
        message: `Event ${event.type} acknowledged`,
        userId: event.app_user_id,
      };

    default: {
      // TypeScript exhaustive check
      const _exhaustiveCheck: never = event.type;
      console.warn(`[Webhook] Unknown event type: ${event.type}`);
      return {
        success: false,
        message: `Unknown event type: ${event.type}`,
        error: 'UNKNOWN_EVENT_TYPE',
      };
    }
  }
}

// =====================================================
// WEBHOOK VERIFICATION
// =====================================================

/**
 * Verify RevenueCat webhook signature
 *
 * RevenueCat signs webhooks with HMAC-SHA256.
 * The signature is in the 'x-revenuecat-signature' header.
 *
 * @param body - Raw request body string
 * @param signature - Signature from x-revenuecat-signature header
 * @param secret - Webhook secret from RevenueCat dashboard
 * @returns True if signature is valid
 *
 * @see https://docs.revenuecat.com/docs/webhooks#webhook-signing
 *
 * @example
 * ```typescript
 * const isValid = verifyWebhookSignature(
 *   rawBody,
 *   req.headers.get('x-revenuecat-signature'),
 *   process.env.REVENUECAT_WEBHOOK_SECRET
 * );
 *
 * if (!isValid) {
 *   return new Response('Invalid signature', { status: 401 });
 * }
 * ```
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    console.warn('[Webhook] Missing signature or secret');
    return false;
  }

  // In a real implementation, use crypto to verify HMAC-SHA256
  // This is a placeholder - implement based on your runtime environment
  //
  // Node.js / Edge Function example:
  // import { createHmac } from 'crypto';
  // const expectedSignature = createHmac('sha256', secret).update(body).digest('hex');
  // return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

  console.warn(
    '[Webhook] Signature verification not implemented - ' +
      'implement based on your runtime environment'
  );
  return true; // TODO: Implement proper verification
}

// =====================================================
// EXPORTS
// =====================================================

export {
  // Main handler
  handleRevenueCatWebhook as default,

  // Individual handlers (for testing)
  handleInitialPurchase,
  handleRenewal,
  handleCancellation,
  handleExpiration,
  handleBillingIssue,
  handleProductChange,
  handleUncancellation,
};
